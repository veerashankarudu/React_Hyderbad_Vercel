package com.accenture.quizhub.service;

import com.accenture.quizhub.dto.request.CreateLiveSessionRequest;
import com.accenture.quizhub.dto.request.JoinLiveSessionRequest;
import com.accenture.quizhub.dto.request.SubmitLiveAnswerRequest;
import com.accenture.quizhub.dto.response.*;
import com.accenture.quizhub.dto.websocket.LiveSessionEvent;
import com.accenture.quizhub.dto.websocket.QuestionPayload;
import com.accenture.quizhub.dto.websocket.QuestionResultPayload;
import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.LiveSessionStatus;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.exception.ConflictException;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveSessionService {

    private static final int PIN_LENGTH = 6;
    private static final int MAX_PIN_RETRIES = 10;
    private static final String PIN_CHARS = "0123456789";
    private static final int BASE_EASY = 1000;
    private static final int BASE_MEDIUM = 1500;
    private static final int BASE_HARD = 2000;

    private final LiveSessionRepository liveSessionRepository;
    private final LiveParticipantRepository participantRepository;
    private final LiveAnswerRepository answerRepository;
    private final LiveSessionRecordingRepository recordingRepository;
    private final QuizSessionRepository quizSessionRepository;
    private final McqRepository mcqRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── PIN generation ──────────────────────────────────────────────────────────

    private final SecureRandom secureRandom = new SecureRandom();

    private String generateUniquePin() {
        List<LiveSessionStatus> activeStatuses = List.of(LiveSessionStatus.WAITING, LiveSessionStatus.ACTIVE);
        for (int attempt = 0; attempt < MAX_PIN_RETRIES; attempt++) {
            StringBuilder sb = new StringBuilder(PIN_LENGTH);
            for (int i = 0; i < PIN_LENGTH; i++) {
                sb.append(PIN_CHARS.charAt(secureRandom.nextInt(PIN_CHARS.length())));
            }
            String pin = sb.toString();
            if (!liveSessionRepository.existsByPinAndStatusIn(pin, activeStatuses)) {
                return pin;
            }
        }
        throw new IllegalStateException("Unable to generate unique PIN after " + MAX_PIN_RETRIES + " attempts");
    }

    // ── Create ───────────────────────────────────────────────────────────────────

    @Transactional
    public LiveSessionResponse createSession(CreateLiveSessionRequest request, String hostEnterpriseId) {
        User host = userRepository.findByEnterpriseId(hostEnterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        QuizSession quiz = quizSessionRepository.findById(request.getQuizId())
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found: " + request.getQuizId()));

        // Verify quiz has MCQs
        if (quiz.getMcqIds() == null || quiz.getMcqIds().isBlank()) {
            throw new BadRequestException("Quiz has no questions");
        }

        // Guard: if host already has a WAITING/ACTIVE session for this quiz, return it instead of creating another
        Optional<LiveSession> existing = liveSessionRepository.findFirstByHostUserIdAndQuizIdAndStatusIn(
                host.getId(), quiz.getId(), List.of(LiveSessionStatus.WAITING, LiveSessionStatus.ACTIVE));
        if (existing.isPresent()) {
            LiveSession ex = existing.get();
            int count = participantRepository.countBySessionId(ex.getId());
            int totalQ = ex.getMcqIds().split(",").length;
            return toResponse(ex, count, totalQ);
        }

        String pin = generateUniquePin();

        LiveSession session = LiveSession.builder()
                .quizId(quiz.getId())
                .quizTitle(quiz.getTitle())
                .mcqIds(quiz.getMcqIds())
                .hostUserId(host.getId())
                .hostEnterpriseId(host.getEnterpriseId())
                .pin(pin)
                .timeLimitSeconds(request.getTimeLimitSeconds())
                .sessionMode(request.getSessionMode() != null ? request.getSessionMode() : "BATTLE")
                .teamMode(request.isTeamMode())
                .adaptiveDifficulty(request.isAdaptiveDifficulty())
                .recordingEnabled(request.isRecordingEnabled())
                .build();

        // Set co-host if provided
        if (request.getCohostEnterpriseId() != null && !request.getCohostEnterpriseId().isBlank()) {
            userRepository.findByEnterpriseId(request.getCohostEnterpriseId())
                    .ifPresent(cohost -> {
                        session.setCohostUserId(cohost.getId());
                        session.setCohostEnterpriseId(cohost.getEnterpriseId());
                    });
        }

        LiveSession saved = liveSessionRepository.save(session);

        int totalQuestions = quiz.getMcqIds().split(",").length;

        return toResponse(saved, 0, totalQuestions);
    }

    // ── List my live sessions (host history) ─────────────────────────────────────

    public List<LiveSessionSummaryResponse> getMyLiveSessions(String hostEnterpriseId) {
        User host = userRepository.findByEnterpriseId(hostEnterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<LiveSession> sessions = liveSessionRepository.findByHostUserIdOrderByCreatedAtDesc(host.getId());

        return sessions.stream()
                .filter(session -> {
                    // Exclude ENDED sessions that were never started (abandoned in lobby)
                    if (session.getStatus() == LiveSessionStatus.ENDED && session.getStartedAt() == null) {
                        return false;
                    }
                    return true;
                })
                .map(session -> {
            int totalQ = session.getMcqIds() == null ? 0 : session.getMcqIds().split(",").length;
            int count = participantRepository.countBySessionId(session.getId());

            String winnerName = null;
            int winnerScore = 0;
            if (session.getStatus() == LiveSessionStatus.ENDED) {
                List<LiveParticipant> top = participantRepository.findBySessionIdOrderByTotalScoreDesc(session.getId());
                if (!top.isEmpty()) {
                    winnerName = top.get(0).getDisplayName();
                    winnerScore = top.get(0).getTotalScore();
                }
            }

            return LiveSessionSummaryResponse.builder()
                    .id(session.getId())
                    .pin(session.getPin())
                    .quizTitle(session.getQuizTitle())
                    .quizId(session.getQuizId())
                    .status(session.getStatus())
                    .totalQuestions(totalQ)
                    .participantCount(count)
                    .timeLimitSeconds(session.getTimeLimitSeconds())
                    .createdAt(session.getCreatedAt())
                    .startedAt(session.getStartedAt())
                    .endedAt(session.getEndedAt())
                    .winnerDisplayName(winnerName)
                    .winnerScore(winnerScore)
                    .build();
        }).collect(Collectors.toList());
    }

    // ── List sessions the user participated in (player history) ─────────────────

    public List<LiveSessionSummaryResponse> getParticipatedSessions(String enterpriseId) {
        User user = userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<LiveParticipant> participations = participantRepository.findByUserId(user.getId());

        return participations.stream()
                .map(p -> liveSessionRepository.findById(p.getSessionId()).orElse(null))
                .filter(session -> session != null)
                .filter(session -> session.getStatus() == LiveSessionStatus.ENDED && session.getStartedAt() != null)
                .distinct()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(session -> {
                    int totalQ = session.getMcqIds() == null ? 0 : session.getMcqIds().split(",").length;
                    int count = participantRepository.countBySessionId(session.getId());
                    List<LiveParticipant> top = participantRepository.findBySessionIdOrderByTotalScoreDesc(session.getId());
                    String winnerName = top.isEmpty() ? null : top.get(0).getDisplayName();
                    int winnerScore = top.isEmpty() ? 0 : top.get(0).getTotalScore();
                    // Find the current user's rank and score
                    int myScore = participations.stream()
                            .filter(pt -> pt.getSessionId().equals(session.getId()))
                            .mapToInt(pt -> pt.getTotalScore())
                            .findFirst().orElse(0);
                    return LiveSessionSummaryResponse.builder()
                            .id(session.getId())
                            .pin(session.getPin())
                            .quizTitle(session.getQuizTitle())
                            .quizId(session.getQuizId())
                            .status(session.getStatus())
                            .totalQuestions(totalQ)
                            .participantCount(count)
                            .timeLimitSeconds(session.getTimeLimitSeconds())
                            .createdAt(session.getCreatedAt())
                            .startedAt(session.getStartedAt())
                            .endedAt(session.getEndedAt())
                            .winnerDisplayName(winnerName)
                            .winnerScore(winnerScore)
                            .build();
                }).collect(Collectors.toList());
    }

    // ── Get single session summary (any authenticated user) ─────────────────────

    public LiveSessionSummaryResponse getSessionSummary(Long sessionId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        int totalQ = session.getMcqIds() == null ? 0 : session.getMcqIds().split(",").length;
        int count = participantRepository.countBySessionId(session.getId());
        String winnerName = null;
        int winnerScore = 0;
        if (session.getStatus() == LiveSessionStatus.ENDED) {
            List<LiveParticipant> top = participantRepository.findBySessionIdOrderByTotalScoreDesc(session.getId());
            if (!top.isEmpty()) {
                winnerName = top.get(0).getDisplayName();
                winnerScore = top.get(0).getTotalScore();
            }
        }
        return LiveSessionSummaryResponse.builder()
                .id(session.getId())
                .pin(session.getPin())
                .quizTitle(session.getQuizTitle())
                .quizId(session.getQuizId())
                .status(session.getStatus())
                .totalQuestions(totalQ)
                .participantCount(count)
                .timeLimitSeconds(session.getTimeLimitSeconds())
                .createdAt(session.getCreatedAt())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .winnerDisplayName(winnerName)
                .winnerScore(winnerScore)
                .build();
    }

    // ── Validate PIN (public) ────────────────────────────────────────────────────

    public LiveSessionResponse validatePin(String pin) {
        // First check if session exists at all (even ENDED) for better error messaging
        Optional<LiveSession> endedSession = liveSessionRepository.findByPin(pin);
        LiveSession session = liveSessionRepository
                .findByPinAndStatusIn(pin, List.of(LiveSessionStatus.WAITING, LiveSessionStatus.ACTIVE))
                .orElseThrow(() -> {
                    if (endedSession.isPresent()) {
                        return new BadRequestException("This game has already ended");
                    }
                    return new ResourceNotFoundException("No active session with PIN: " + pin);
                });
        int count = participantRepository.countBySessionId(session.getId());
        int totalQ = session.getMcqIds().split(",").length;
        return toResponse(session, count, totalQ);
    }

    // ── Join ─────────────────────────────────────────────────────────────────────

    @Transactional
    public JoinLiveSessionResponse joinSession(String pin, JoinLiveSessionRequest request, String enterpriseId) {
        LiveSession session = liveSessionRepository
                .findByPinAndStatusIn(pin, List.of(LiveSessionStatus.WAITING, LiveSessionStatus.ACTIVE))
                .orElseThrow(() -> new ResourceNotFoundException("No active session with PIN: " + pin));

        String displayName = request.getDisplayName().trim();

        // Check for duplicate display name in this session
        if (participantRepository.existsBySessionIdAndDisplayName(session.getId(), displayName)) {
            throw new ConflictException("Display name '" + displayName + "' is already taken in this session");
        }

        // Resolve userId from enterpriseId if the caller is authenticated
        Long userId = null;
        if (enterpriseId != null) {
            userId = userRepository.findByEnterpriseId(enterpriseId)
                    .map(u -> u.getId())
                    .orElse(null);
        }

        String rejoinToken = UUID.randomUUID().toString();

        LiveParticipant participant = LiveParticipant.builder()
                .sessionId(session.getId())
                .userId(userId)
                .displayName(displayName)
                .teamName(request.getTeamName())
                .rejoinToken(rejoinToken)
                .joinedAt(LocalDateTime.now())
                .build();

        participant = participantRepository.save(participant);

        // Broadcast participant joined
        broadcastEvent(session.getId(), LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.PARTICIPANT_JOINED)
                .payload(Map.of(
                        "participantId", participant.getId(),
                        "displayName", displayName,
                        "participantCount", participantRepository.countBySessionId(session.getId())
                ))
                .build());

        return JoinLiveSessionResponse.builder()
                .sessionId(session.getId())
                .participantId(participant.getId())
                .displayName(displayName)
                .rejoinToken(rejoinToken)
                .quizTitle(session.getQuizTitle())
                .timeLimitSeconds(session.getTimeLimitSeconds())
                .joinedAt(participant.getJoinedAt())
                .build();
    }

    // ── Reconnect ────────────────────────────────────────────────────────────────

    @Transactional
    public JoinLiveSessionResponse reconnect(Long sessionId, String rejoinToken) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (session.getStatus() == LiveSessionStatus.ENDED) {
            throw new BadRequestException("Session has ended");
        }

        LiveParticipant participant = participantRepository.findByRejoinToken(rejoinToken)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid rejoin token"));

        if (!participant.getSessionId().equals(sessionId)) {
            throw new BadRequestException("Token does not belong to this session");
        }

        if (!participant.isActive()) {
            throw new BadRequestException("You have been removed from this session");
        }

        return JoinLiveSessionResponse.builder()
                .sessionId(session.getId())
                .participantId(participant.getId())
                .displayName(participant.getDisplayName())
                .rejoinToken(rejoinToken)
                .quizTitle(session.getQuizTitle())
                .timeLimitSeconds(session.getTimeLimitSeconds())
                .joinedAt(participant.getJoinedAt())
                .build();
    }

    // ── Host: Start ───────────────────────────────────────────────────────────────

    @Transactional
    public void startSession(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);

        if (session.getStatus() != LiveSessionStatus.WAITING) {
            throw new BadRequestException("Session is not in WAITING status");
        }

        session.setStatus(LiveSessionStatus.ACTIVE);
        session.setStartedAt(LocalDateTime.now());
        liveSessionRepository.save(session);

        broadcastEvent(sessionId, LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.SESSION_STARTED)
                .payload(Map.of("sessionId", sessionId))
                .build());

        // Auto-advance to first question
        advanceToQuestion(session, 0);
    }

    // ── Host: Next Question ────────────────────────────────────────────────────────

    @Transactional
    public void nextQuestion(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);

        if (session.getStatus() != LiveSessionStatus.ACTIVE) {
            throw new BadRequestException("Session is not active");
        }

        int nextIndex = session.getCurrentQuestionIndex() + 1;
        String[] mcqIds = session.getMcqIds().split(",");

        if (nextIndex >= mcqIds.length) {
            endSession(session);
        } else {
            session.setCurrentQuestionIndex(nextIndex);
            liveSessionRepository.save(session);
            advanceToQuestion(session, nextIndex);
        }
    }

    // ── Host: Show Results (timer expired or manual) — broadcasts to all clients ─────

    @Transactional
    public QuestionResultPayload endCurrentQuestionResults(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        // Broadcast QUESTION_RESULT to all WebSocket subscribers
        endCurrentQuestion(session);
        return buildQuestionResult(session, session.getCurrentQuestionIndex());
    }

    // ── Host: Pause / Resume ──────────────────────────────────────────────────────

    @Transactional
    public void pauseSession(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        if (session.getStatus() != LiveSessionStatus.ACTIVE) throw new BadRequestException("Session is not active");
        session.setPaused(true);
        liveSessionRepository.save(session);
        broadcastEvent(sessionId, LiveSessionEvent.builder().type(LiveSessionEvent.Type.SESSION_PAUSED).payload(Map.of()).build());
    }

    @Transactional
    public void resumeSession(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        if (!session.isPaused()) throw new BadRequestException("Session is not paused");
        session.setPaused(false);
        liveSessionRepository.save(session);
        broadcastEvent(sessionId, LiveSessionEvent.builder().type(LiveSessionEvent.Type.SESSION_RESUMED).payload(Map.of()).build());
    }

    // ── Host: Extend time ─────────────────────────────────────────────────────────

    @Transactional
    public void extendQuestion(Long sessionId, String hostEnterpriseId, int extraSeconds) {
        if (extraSeconds < 5 || extraSeconds > 60) {
            throw new BadRequestException("Extra time must be between 5 and 60 seconds");
        }
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        if (session.getStatus() != LiveSessionStatus.ACTIVE) throw new BadRequestException("Session is not active");
        session.setTimeLimitSeconds(session.getTimeLimitSeconds() + extraSeconds);
        liveSessionRepository.save(session);
        broadcastEvent(sessionId, LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.QUESTION_STARTED)
                .payload(Map.of("extraSeconds", extraSeconds,
                               "newTimeLimitSeconds", session.getTimeLimitSeconds()))
                .build());
    }

    // ── Host: Kick participant ─────────────────────────────────────────────────────

    @Transactional
    public void kickParticipant(Long sessionId, Long participantId, String hostEnterpriseId) {
        getSessionForHost(sessionId, hostEnterpriseId); // auth check

        LiveParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        if (!participant.getSessionId().equals(sessionId)) {
            throw new BadRequestException("Participant does not belong to this session");
        }

        participant.setActive(false);
        participantRepository.save(participant);

        broadcastEvent(sessionId, LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.PARTICIPANT_KICKED)
                .payload(Map.of("participantId", participantId,
                               "displayName", participant.getDisplayName()))
                .build());
    }

    // ── Host: End session ─────────────────────────────────────────────────────────

    @Transactional
    public void endSessionByHost(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        endSession(session);
    }

    // ── Participant: Submit answer ────────────────────────────────────────────────

    @Transactional
    public AnswerResultResponse submitAnswer(Long sessionId, Long participantId,
                                              SubmitLiveAnswerRequest request) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (session.getStatus() != LiveSessionStatus.ACTIVE) {
            throw new BadRequestException("Session is not active");
        }
        if (session.isPaused()) {
            throw new BadRequestException("Session is paused");
        }

        LiveParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        if (!participant.getSessionId().equals(sessionId)) {
            throw new BadRequestException("Participant does not belong to this session");
        }
        if (!participant.isActive()) {
            throw new BadRequestException("Participant has been removed from session");
        }

        // Idempotency — one answer per question per participant
        if (answerRepository.existsBySessionIdAndParticipantIdAndQuestionId(
                sessionId, participantId, request.getQuestionId())) {
            throw new ConflictException("Answer already submitted for this question");
        }

        Mcq mcq = mcqRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));

        boolean correct;
        String selectedOpt = request.getSelectedOption().toUpperCase().trim();
        String expectedOpt = mcq.getCorrectAnswer().toUpperCase().trim();
        if (expectedOpt.contains(",") || selectedOpt.contains(",")) {
            java.util.Set<String> givenSet = new java.util.TreeSet<>(java.util.Arrays.asList(selectedOpt.split(",")));
            java.util.Set<String> expectedSet = new java.util.TreeSet<>(java.util.Arrays.asList(expectedOpt.split(",")));
            correct = givenSet.equals(expectedSet);
        } else {
            correct = expectedOpt.equalsIgnoreCase(selectedOpt);
        }
        long responseTimeMs = computeServerResponseTime(session);
        int points = correct ? calculatePoints(mcq.getDifficulty(), responseTimeMs,
                session.getTimeLimitSeconds() * 1000L) : 0;

        LiveAnswer answer = LiveAnswer.builder()
                .sessionId(sessionId)
                .participantId(participantId)
                .questionId(mcq.getId())
                .selectedOption(request.getSelectedOption().toUpperCase())
                .correct(correct)
                .pointsEarned(points)
                .responseTimeMs(responseTimeMs)
                .answeredAt(LocalDateTime.now())
                .build();
        answerRepository.save(answer);

        participant.setTotalScore(participant.getTotalScore() + points);
        participantRepository.save(participant);

        // Recompute ranks
        List<LiveParticipant> ranked = participantRepository
                .findBySessionIdOrderByTotalScoreDesc(sessionId);
        updateRanks(ranked);

        int currentRank = ranked.indexOf(participant) + 1;

        // Broadcast answer count
        long answeredCount = ranked.stream()
                .filter(p -> answerRepository.existsBySessionIdAndParticipantIdAndQuestionId(
                        sessionId, p.getId(), mcq.getId()))
                .count();
        broadcastEvent(sessionId, LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.ANSWER_SUBMITTED)
                .payload(Map.of("answeredCount", answeredCount,
                               "totalParticipants", ranked.size()))
                .build());

        return AnswerResultResponse.builder()
                .correct(correct)
                .correctAnswer(mcq.getCorrectAnswer())
                .pointsEarned(points)
                .totalScore(participant.getTotalScore())
                .responseTimeMs(responseTimeMs)
                .rank(currentRank)
                .totalParticipants(ranked.size())
                .build();
    }

    // ── Host state restore (for page reload) ─────────────────────────────────────

    public LiveSessionResponse getSessionState(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        String[] mcqIdArray = session.getMcqIds() == null ? new String[0] : session.getMcqIds().split(",");
        int totalQuestions = mcqIdArray.length;
        int participantCount = participantRepository.countBySessionId(sessionId);

        int questionTimeLeft = 0;
        QuestionPayload currentQuestion = null;

        if (session.getStatus() == LiveSessionStatus.ACTIVE && session.getQuestionStartedAt() != null) {
            long elapsed = ChronoUnit.SECONDS.between(session.getQuestionStartedAt(), LocalDateTime.now());
            questionTimeLeft = (int) Math.max(0, session.getTimeLimitSeconds() - elapsed);

            // Reconstruct current question payload for host reconnect
            int idx = session.getCurrentQuestionIndex();
            if (idx < mcqIdArray.length) {
                long questionId = Long.parseLong(mcqIdArray[idx].trim());
                Mcq mcq = mcqRepository.findById(questionId).orElse(null);
                if (mcq != null) {
                    currentQuestion = QuestionPayload.builder()
                            .questionId(mcq.getId())
                            .questionIndex(idx)
                            .totalQuestions(totalQuestions)
                            .questionStem(mcq.getQuestionStem())
                            .optionA(mcq.getOptionA())
                            .optionB(mcq.getOptionB())
                            .optionC(mcq.getOptionC())
                            .optionD(mcq.getOptionD())
                            .difficulty(mcq.getDifficulty().name())
                            .timeLimitSeconds(session.getTimeLimitSeconds())
                            .questionStartedAt(session.getQuestionStartedAt())
                            .build();
                }
            }
        }

        return LiveSessionResponse.builder()
                .id(session.getId())
                .pin(session.getPin())
                .quizTitle(session.getQuizTitle())
                .quizId(session.getQuizId())
                .status(session.getStatus())
                .currentQuestionIndex(session.getCurrentQuestionIndex())
                .totalQuestions(totalQuestions)
                .timeLimitSeconds(session.getTimeLimitSeconds())
                .participantCount(participantCount)
                .hostEnterpriseId(session.getHostEnterpriseId())
                .createdAt(session.getCreatedAt())
                .startedAt(session.getStartedAt())
                .questionTimeLeft(questionTimeLeft)
                .paused(session.isPaused())
                .currentQuestion(currentQuestion)
                .build();
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────────

    public List<LeaderboardEntryResponse> getLeaderboard(Long sessionId) {
        liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        List<LiveParticipant> participants = participantRepository
                .findBySessionIdOrderByTotalScoreDesc(sessionId);
        return buildLeaderboard(participants, null);
    }

    // ── Global leaderboard: all ENDED sessions with participants, optionally filtered by sessionId ──

    public Map<String, Object> getGlobalLeaderboard(Long sessionId) {
        // Sessions dropdown: only ENDED sessions that have participants
        List<LiveSession> endedSessions = liveSessionRepository.findByStatus(LiveSessionStatus.ENDED)
                .stream()
                .filter(s -> s.getStartedAt() != null)
                .sorted(Comparator.comparing(LiveSession::getEndedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        List<Map<String, Object>> sessionList = endedSessions.stream().map(s -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("title", s.getQuizTitle());
            m.put("pin", s.getPin());
            m.put("endedAt", s.getEndedAt() != null ? s.getEndedAt().toString() : null);
            m.put("participantCount", participantRepository.countBySessionId(s.getId()));
            return m;
        }).collect(Collectors.toList());

        // Participants: if sessionId provided, use that session only; else use all ENDED sessions
        List<LiveParticipant> allParticipants;
        Map<Long, String> sessionTitles = endedSessions.stream()
                .collect(Collectors.toMap(LiveSession::getId, LiveSession::getQuizTitle));

        if (sessionId != null) {
            allParticipants = participantRepository.findBySessionIdOrderByTotalScoreDesc(sessionId);
        } else {
            allParticipants = endedSessions.stream()
                    .flatMap(s -> participantRepository.findBySessionIdOrderByTotalScoreDesc(s.getId()).stream())
                    .sorted(Comparator.comparingInt(LiveParticipant::getTotalScore).reversed())
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> ranked = new ArrayList<>();
        for (int i = 0; i < allParticipants.size(); i++) {
            LiveParticipant p = allParticipants.get(i);
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("rank", i + 1);
            m.put("participantId", p.getId());
            m.put("displayName", p.getDisplayName());
            m.put("totalScore", p.getTotalScore());
            m.put("sessionId", p.getSessionId());
            m.put("sessionTitle", sessionTitles.getOrDefault(p.getSessionId(), "Unknown"));
            ranked.add(m);
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("sessions", sessionList);
        result.put("leaderboard", ranked);
        return result;
    }

    // ── Host disconnect/reconnect ──────────────────────────────────────────────────

    @Transactional
    public void recordHostDisconnect(Long sessionId) {
        liveSessionRepository.findById(sessionId).ifPresent(session -> {
            if (session.getStatus() == LiveSessionStatus.ACTIVE) {
                session.setHostDisconnectedAt(LocalDateTime.now());
                session.setPaused(true);
                liveSessionRepository.save(session);
                broadcastEvent(sessionId, LiveSessionEvent.builder()
                        .type(LiveSessionEvent.Type.HOST_DISCONNECTED)
                        .payload(Map.of("message", "Host disconnected — session paused"))
                        .build());
            }
        });
    }

    @Transactional
    public void recordHostReconnect(Long sessionId, String hostEnterpriseId) {
        LiveSession session = getSessionForHost(sessionId, hostEnterpriseId);
        session.setHostDisconnectedAt(null);
        session.setPaused(false);
        liveSessionRepository.save(session);
        broadcastEvent(sessionId, LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.HOST_RECONNECTED)
                .payload(Map.of("message", "Host reconnected — session resumed"))
                .build());
    }

    // ── Internal helpers ──────────────────────────────────────────────────────────

    private void advanceToQuestion(LiveSession session, int index) {
        String[] mcqIds = session.getMcqIds().split(",");
        if (index >= mcqIds.length) {
            endSession(session);
            return;
        }

        long questionId = Long.parseLong(mcqIds[index].trim());
        Mcq mcq = mcqRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found: " + questionId));

        session.setQuestionStartedAt(LocalDateTime.now());
        session.setCurrentQuestionIndex(index);
        liveSessionRepository.save(session);

        QuestionPayload payload = QuestionPayload.builder()
                .questionId(mcq.getId())
                .questionIndex(index)
                .totalQuestions(mcqIds.length)
                .questionStem(mcq.getQuestionStem())
                .optionA(mcq.getOptionA())
                .optionB(mcq.getOptionB())
                .optionC(mcq.getOptionC())
                .optionD(mcq.getOptionD())
                .difficulty(mcq.getDifficulty().name())
                .timeLimitSeconds(session.getTimeLimitSeconds())
                .questionStartedAt(session.getQuestionStartedAt())
                .build();

        messagingTemplate.convertAndSend("/topic/session/" + session.getId() + "/question", payload);
        broadcastEvent(session.getId(), LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.QUESTION_STARTED)
                .payload(payload)
                .build());
    }

    private void endCurrentQuestion(LiveSession session) {
        QuestionResultPayload result = buildQuestionResult(session, session.getCurrentQuestionIndex());
        messagingTemplate.convertAndSend("/topic/session/" + session.getId() + "/question-result", result);
        broadcastEvent(session.getId(), LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.QUESTION_ENDED)
                .payload(result)
                .build());
    }

    private QuestionResultPayload buildQuestionResult(LiveSession session, int index) {
        String[] mcqIds = session.getMcqIds().split(",");
        long questionId = Long.parseLong(mcqIds[index].trim());
        Mcq mcq = mcqRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found: " + questionId));

        List<LiveParticipant> participants = participantRepository
                .findBySessionIdOrderByTotalScoreDesc(session.getId());
        int total = participants.size();

        // Count answers per option
        Map<String, Long> optionCounts = new LinkedHashMap<>();
        optionCounts.put("A", 0L); optionCounts.put("B", 0L);
        optionCounts.put("C", 0L); optionCounts.put("D", 0L);
        List<LiveAnswer> answers = participants.stream()
                .map(p -> answerRepository.findBySessionIdAndParticipantIdAndQuestionId(
                        session.getId(), p.getId(), questionId).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        answers.forEach(a -> optionCounts.merge(a.getSelectedOption(), 1L, Long::sum));

        List<LeaderboardEntryResponse> leaderboard = buildLeaderboard(participants, null);

        return QuestionResultPayload.builder()
                .questionId(questionId)
                .questionIndex(index)
                .correctAnswer(mcq.getCorrectAnswer())
                .optionA(mcq.getOptionA())
                .optionB(mcq.getOptionB())
                .optionC(mcq.getOptionC())
                .optionD(mcq.getOptionD())
                .optionCounts(optionCounts)
                .leaderboard(leaderboard)
                .answeredCount(answers.size())
                .totalParticipants(total)
                .build();
    }

    private void endSession(LiveSession session) {
        session.setStatus(LiveSessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        liveSessionRepository.save(session);

        List<LiveParticipant> participants = participantRepository
                .findBySessionIdOrderByTotalScoreDesc(session.getId());
        updateRanks(participants);

        List<LeaderboardEntryResponse> leaderboard = buildLeaderboard(participants, null);

        broadcastEvent(session.getId(), LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.SESSION_ENDED)
                .payload(Map.of("sessionId", session.getId(), "leaderboard", leaderboard))
                .build());
    }

    private void updateRanks(List<LiveParticipant> sortedParticipants) {
        for (int i = 0; i < sortedParticipants.size(); i++) {
            sortedParticipants.get(i).setRank(i + 1);
        }
        participantRepository.saveAll(sortedParticipants);
    }

    private List<LeaderboardEntryResponse> buildLeaderboard(
            List<LiveParticipant> sorted, Long currentParticipantId) {
        List<LeaderboardEntryResponse> result = new ArrayList<>();
        int top = Math.min(sorted.size(), 10);
        // Determine total questions from session's mcqIds
        int totalQuestions = 0;
        if (!sorted.isEmpty()) {
            Long sessionId = sorted.get(0).getSessionId();
            totalQuestions = liveSessionRepository.findById(sessionId)
                    .map(s -> s.getMcqIds().split(",").length)
                    .orElse(0);
        }
        for (int i = 0; i < top; i++) {
            LiveParticipant p = sorted.get(i);
            int correctCount = answerRepository.countBySessionIdAndParticipantIdAndCorrectTrue(
                    p.getSessionId(), p.getId());
            result.add(LeaderboardEntryResponse.builder()
                    .rank(i + 1)
                    .participantId(p.getId())
                    .displayName(p.getDisplayName())
                    .totalScore(p.getTotalScore())
                    .correctCount(correctCount)
                    .totalQuestions(totalQuestions)
                    .isCurrentUser(currentParticipantId != null && p.getId().equals(currentParticipantId))
                    .build());
        }
        return result;
    }

    private LiveSession getSessionForHost(Long sessionId, String hostEnterpriseId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        if (!session.getHostEnterpriseId().equals(hostEnterpriseId)) {
            throw new BadRequestException("You are not the host of this session");
        }
        return session;
    }

    /**
     * Score formula: base × (1 – (responseTime / timeLimitMs) × 0.5)
     * Max = base, min = base × 0.5 (half points for last-second answers)
     */
    private int calculatePoints(Difficulty difficulty, long responseTimeMs, long timeLimitMs) {
        int base = switch (difficulty) {
            case EASY   -> BASE_EASY;
            case MEDIUM -> BASE_MEDIUM;
            case HARD   -> BASE_HARD;
        };
        double ratio = (double) Math.min(responseTimeMs, timeLimitMs) / timeLimitMs;
        return (int) Math.round(base * (1.0 - ratio * 0.5));
    }

    /**
     * Compute elapsed ms since question started using server clock.
     */
    private long computeServerResponseTime(LiveSession session) {
        if (session.getQuestionStartedAt() == null) return 0L;
        return ChronoUnit.MILLIS.between(session.getQuestionStartedAt(), LocalDateTime.now());
    }

    private void broadcastEvent(Long sessionId, LiveSessionEvent event) {
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/events", event);
    }

    private LiveSessionResponse toResponse(LiveSession session, int participantCount, int totalQuestions) {
        return LiveSessionResponse.builder()
                .id(session.getId())
                .pin(session.getPin())
                .quizTitle(session.getQuizTitle())
                .quizId(session.getQuizId())
                .status(session.getStatus())
                .currentQuestionIndex(session.getCurrentQuestionIndex())
                .totalQuestions(totalQuestions)
                .timeLimitSeconds(session.getTimeLimitSeconds())
                .participantCount(participantCount)
                .hostEnterpriseId(session.getHostEnterpriseId())
                .createdAt(session.getCreatedAt())
                .startedAt(session.getStartedAt())
                .sessionMode(session.getSessionMode())
                .teamMode(session.isTeamMode())
                .adaptiveDifficulty(session.isAdaptiveDifficulty())
                .recordingEnabled(session.isRecordingEnabled())
                .cohostEnterpriseId(session.getCohostEnterpriseId())
                .inviteLink("/live/join?pin=" + session.getPin())
                .build();
    }

    // ── Scheduler-facing methods ───────────────────────────────────────────────────

    @Transactional
    public void autoExpireWaitingSessions(LocalDateTime cutoff) {
        List<LiveSession> expired = liveSessionRepository.findExpiredWaitingSessions(cutoff);
        expired.forEach(s -> {
            s.setStatus(LiveSessionStatus.ENDED);
            s.setEndedAt(LocalDateTime.now());
            liveSessionRepository.save(s);
            log.info("Auto-expired waiting session id={}", s.getId());
        });
    }

    @Transactional
    public void autoEndAbandonedSessions(LocalDateTime cutoff) {
        List<LiveSession> abandoned = liveSessionRepository.findAbandonedActiveSessions(cutoff);
        abandoned.forEach(s -> {
            endSession(s);
            log.info("Auto-ended abandoned session id={}", s.getId());
        });
    }

    @Transactional
    public void cleanupOldEndedSessions() {
        // We don't delete ended sessions directly but we could archive them.
        // For now just log.
        log.debug("Cleanup old ended sessions — no-op in current implementation");
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ── PHASE 2 FEATURES ──────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════════

    // ── Co-host / Host Transfer ──────────────────────────────────────────────────

    @Transactional
    public void transferHostToCohost(Long sessionId, String currentHostEnterpriseId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!session.getHostEnterpriseId().equals(currentHostEnterpriseId)) {
            throw new BadRequestException("Only the current host can transfer the host role");
        }
        if (session.getCohostEnterpriseId() == null || session.getCohostUserId() == null) {
            throw new BadRequestException("No co-host designated for this session");
        }

        // Transfer: co-host becomes host, old host becomes co-host
        String newHostEid = session.getCohostEnterpriseId();
        Long newHostUid = session.getCohostUserId();

        session.setCohostUserId(session.getHostUserId());
        session.setCohostEnterpriseId(session.getHostEnterpriseId());
        session.setHostUserId(newHostUid);
        session.setHostEnterpriseId(newHostEid);
        liveSessionRepository.save(session);

        broadcastEvent(sessionId, LiveSessionEvent.builder()
                .type(LiveSessionEvent.Type.HOST_RECONNECTED)
                .payload(Map.of("message", "Host transferred to " + newHostEid,
                        "newHost", newHostEid, "newCohost", session.getCohostEnterpriseId()))
                .build());
        log.info("Host transferred for session {} from {} to {}", sessionId, currentHostEnterpriseId, newHostEid);
    }

    // ── Session Recording / Replay ───────────────────────────────────────────────

    public void recordEvent(Long sessionId, String eventType, Map<String, Object> payload) {
        LiveSession session = liveSessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.isRecordingEnabled()) return;

        long elapsedMs = 0;
        if (session.getStartedAt() != null) {
            elapsedMs = ChronoUnit.MILLIS.between(session.getStartedAt(), LocalDateTime.now());
        }

        int seq = recordingRepository.countBySessionId(sessionId) + 1;
        String payloadJson = "{}";
        try {
            payloadJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);
        } catch (Exception e) {
            log.warn("Failed to serialize recording payload: {}", e.getMessage());
        }

        LiveSessionRecording recording = LiveSessionRecording.builder()
                .sessionId(sessionId)
                .sequenceNum(seq)
                .eventType(eventType)
                .payload(payloadJson)
                .elapsedMs(elapsedMs)
                .build();
        recordingRepository.save(recording);
    }

    public List<Map<String, Object>> getSessionReplay(Long sessionId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!session.isRecordingEnabled()) {
            throw new BadRequestException("Recording was not enabled for this session");
        }

        List<LiveSessionRecording> events = recordingRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        List<Map<String, Object>> replay = new ArrayList<>();
        for (LiveSessionRecording event : events) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("sequenceNum", event.getSequenceNum());
            entry.put("eventType", event.getEventType());
            entry.put("elapsedMs", event.getElapsedMs());
            entry.put("payload", event.getPayload());
            entry.put("recordedAt", event.getRecordedAt());
            replay.add(entry);
        }
        return replay;
    }

    // ── Team Leaderboard ─────────────────────────────────────────────────────────

    public List<Map<String, Object>> getTeamLeaderboard(Long sessionId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!session.isTeamMode()) {
            throw new BadRequestException("Team mode is not enabled for this session");
        }

        List<LiveParticipant> participants = participantRepository
                .findBySessionIdOrderByTotalScoreDesc(sessionId);

        // Group by team name and sum scores
        Map<String, List<LiveParticipant>> teams = participants.stream()
                .filter(p -> p.getTeamName() != null && !p.getTeamName().isBlank())
                .collect(Collectors.groupingBy(LiveParticipant::getTeamName));

        List<Map<String, Object>> teamScores = new ArrayList<>();
        for (Map.Entry<String, List<LiveParticipant>> entry : teams.entrySet()) {
            int totalScore = entry.getValue().stream().mapToInt(LiveParticipant::getTotalScore).sum();
            Map<String, Object> teamEntry = new LinkedHashMap<>();
            teamEntry.put("teamName", entry.getKey());
            teamEntry.put("totalScore", totalScore);
            teamEntry.put("memberCount", entry.getValue().size());
            teamEntry.put("members", entry.getValue().stream()
                    .map(p -> Map.of("displayName", p.getDisplayName(), "score", p.getTotalScore()))
                    .collect(Collectors.toList()));
            teamScores.add(teamEntry);
        }

        // Sort by total score descending
        teamScores.sort((a, b) -> Integer.compare((int) b.get("totalScore"), (int) a.get("totalScore")));

        // Add rank
        for (int i = 0; i < teamScores.size(); i++) {
            teamScores.get(i).put("rank", i + 1);
        }
        return teamScores;
    }

    // ── Adaptive Difficulty ──────────────────────────────────────────────────────

    /**
     * Returns the next question MCQ ID based on adaptive difficulty.
     * If the participant is doing well (>70% correct), pick a harder question.
     * If doing poorly (<40% correct), pick an easier question.
     */
    public Long getAdaptiveNextQuestionId(Long sessionId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!session.isAdaptiveDifficulty()) return null;

        // Calculate overall session performance
        List<LiveParticipant> participants = participantRepository.findBySessionIdOrderByTotalScoreDesc(sessionId);
        if (participants.isEmpty()) return null;

        long totalAnswers = answerRepository.countBySessionId(sessionId);
        long correctAnswers = answerRepository.countBySessionIdAndCorrect(sessionId, true);
        double accuracy = totalAnswers > 0 ? (double) correctAnswers / totalAnswers : 0.5;

        // Determine target difficulty
        Difficulty targetDifficulty;
        if (accuracy > 0.70) {
            targetDifficulty = Difficulty.HARD;
        } else if (accuracy < 0.40) {
            targetDifficulty = Difficulty.EASY;
        } else {
            targetDifficulty = Difficulty.MEDIUM;
        }

        // Find unasked questions at target difficulty from the session's question pool
        String[] mcqIdStrings = session.getMcqIds().split(",");
        List<Long> allMcqIds = Arrays.stream(mcqIdStrings)
                .map(s -> Long.parseLong(s.trim()))
                .collect(Collectors.toList());

        // Get already-asked question indices
        int currentIndex = session.getCurrentQuestionIndex();
        List<Long> remaining = allMcqIds.subList(Math.min(currentIndex + 1, allMcqIds.size()), allMcqIds.size());

        // Try to find a question at the target difficulty
        for (Long mcqId : remaining) {
            Mcq mcq = mcqRepository.findById(mcqId).orElse(null);
            if (mcq != null && mcq.getDifficulty() == targetDifficulty) {
                return mcqId;
            }
        }
        // Fallback: return next in sequence
        return remaining.isEmpty() ? null : remaining.get(0);
    }

    // ── Invite Link Generation ───────────────────────────────────────────────────

    public Map<String, String> generateInviteLink(Long sessionId, String origin) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        String link = origin + "/live/join?pin=" + session.getPin();
        String slackMessage = "🎮 *Join Live Quiz: " + session.getQuizTitle() + "*\n"
                + "PIN: `" + session.getPin() + "`\n"
                + "Link: " + link;
        String teamsMessage = "🎮 **Join Live Quiz: " + session.getQuizTitle() + "**\n\n"
                + "PIN: `" + session.getPin() + "`\n\n"
                + "[Join Now](" + link + ")";

        Map<String, String> result = new LinkedHashMap<>();
        result.put("link", link);
        result.put("pin", session.getPin());
        result.put("slackMessage", slackMessage);
        result.put("teamsMessage", teamsMessage);
        result.put("plainText", "Join my live quiz \"" + session.getQuizTitle() + "\" - PIN: " + session.getPin() + " - " + link);
        return result;
    }
}
