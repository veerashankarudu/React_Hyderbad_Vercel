package com.valkey.quizhub.controller;

import com.valkey.quizhub.dto.request.*;
import com.valkey.quizhub.dto.response.*;
import com.valkey.quizhub.dto.websocket.QuestionResultPayload;
import com.valkey.quizhub.service.LiveSessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/live/sessions")
@RequiredArgsConstructor
public class LiveSessionController {

    private final LiveSessionService liveSessionService;

    // ── Host: Create session ────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<LiveSessionResponse> createSession(
            @Valid @RequestBody CreateLiveSessionRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        LiveSessionResponse response = liveSessionService.createSession(request, enterpriseId);
        // 200 if returning existing session, 201 if new
        HttpStatus status = response.getStartedAt() == null && response.getParticipantCount() == 0
                ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(response);
    }

    // ── Host: My live session history ────────────────────────────────────────────

    @GetMapping("/my-sessions")
    public ResponseEntity<List<LiveSessionSummaryResponse>> getMySessions(
            @AuthenticationPrincipal String enterpriseId) {
        return ResponseEntity.ok(liveSessionService.getMyLiveSessions(enterpriseId));
    }

    // ── Player: Sessions I participated in ───────────────────────────────────────

    @GetMapping("/participated-sessions")
    public ResponseEntity<List<LiveSessionSummaryResponse>> getParticipatedSessions(
            @AuthenticationPrincipal String enterpriseId) {
        return ResponseEntity.ok(liveSessionService.getParticipatedSessions(enterpriseId));
    }

    // ── Public: Validate PIN ────────────────────────────────────────────────────

    @GetMapping("/{pin}/validate")
    public ResponseEntity<LiveSessionResponse> validatePin(@PathVariable String pin) {
        return ResponseEntity.ok(liveSessionService.validatePin(pin));
    }

    // ── Host: Get session state (for page reload / reconnect) ──────────────────

    @GetMapping("/{sessionId}/state")
    public ResponseEntity<LiveSessionResponse> getSessionState(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        return ResponseEntity.ok(liveSessionService.getSessionState(sessionId, enterpriseId));
    }

    // ── Public / Optional-auth: Join ─────────────────────────────────────────────

    @PostMapping("/{pin}/join")
    public ResponseEntity<JoinLiveSessionResponse> join(
            @PathVariable String pin,
            @Valid @RequestBody JoinLiveSessionRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        // enterpriseId is null for guests; service resolves userId from it when available
        JoinLiveSessionResponse response = liveSessionService.joinSession(pin, request, enterpriseId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── Public: Reconnect ─────────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/reconnect")
    public ResponseEntity<JoinLiveSessionResponse> reconnect(
            @PathVariable Long sessionId,
            @Valid @RequestBody ReconnectRequest request) {
        return ResponseEntity.ok(liveSessionService.reconnect(sessionId, request.getRejoinToken()));
    }

    // ── Host: Start ────────────────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/start")
    public ResponseEntity<Map<String, String>> startSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.startSession(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Session started"));
    }

    // ── Host: Next Question ───────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/next-question")
    public ResponseEntity<Map<String, String>> nextQuestion(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.nextQuestion(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Advanced to next question"));
    }

    // ── Host: End Current Question (returns results) ──────────────────────────────

    @PostMapping("/{sessionId}/end-question")
    public ResponseEntity<QuestionResultPayload> endCurrentQuestion(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        return ResponseEntity.ok(liveSessionService.endCurrentQuestionResults(sessionId, enterpriseId));
    }

    // ── Host: Pause ───────────────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/pause")
    public ResponseEntity<Map<String, String>> pause(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.pauseSession(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Session paused"));
    }

    // ── Host: Resume ──────────────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/resume")
    public ResponseEntity<Map<String, String>> resume(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.resumeSession(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Session resumed"));
    }

    // ── Host: Extend time ─────────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/extend")
    public ResponseEntity<Map<String, String>> extend(
            @PathVariable Long sessionId,
            @RequestParam @Min(5) @Max(60) int seconds,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.extendQuestion(sessionId, enterpriseId, seconds);
        return ResponseEntity.ok(Map.of("message", "Time extended by " + seconds + " seconds"));
    }

    // ── Host: Kick participant ────────────────────────────────────────────────────

    @DeleteMapping("/{sessionId}/participants/{participantId}")
    public ResponseEntity<Map<String, String>> kickParticipant(
            @PathVariable Long sessionId,
            @PathVariable Long participantId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.kickParticipant(sessionId, participantId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Participant removed"));
    }

    // ── Host: End session ─────────────────────────────────────────────────────────

    @PostMapping("/{sessionId}/end")
    public ResponseEntity<Map<String, String>> endSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.endSessionByHost(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Session ended"));
    }

    // ── Host: Reconnect after disconnect ─────────────────────────────────────────

    @PostMapping("/{sessionId}/host-reconnect")
    public ResponseEntity<Map<String, String>> hostReconnect(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.recordHostReconnect(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Host reconnected"));
    }

    // ── Participant: Submit answer ─────────────────────────────────────────────────

    @PostMapping("/{sessionId}/participants/{participantId}/answers")
    public ResponseEntity<AnswerResultResponse> submitAnswer(
            @PathVariable Long sessionId,
            @PathVariable Long participantId,
            @Valid @RequestBody SubmitLiveAnswerRequest request) {
        return ResponseEntity.ok(liveSessionService.submitAnswer(sessionId, participantId, request));
    }

    // ── Session summary (any authenticated user) ──────────────────────────────────

    @GetMapping("/{sessionId}/summary")
    public ResponseEntity<LiveSessionSummaryResponse> getSessionSummary(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(liveSessionService.getSessionSummary(sessionId));
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────────

    @GetMapping("/{sessionId}/leaderboard")
    public ResponseEntity<List<LeaderboardEntryResponse>> leaderboard(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(liveSessionService.getLeaderboard(sessionId));
    }

    // ── Global leaderboard (for Leaderboard page Live Quiz tab) ──────────────────
    // GET /live/sessions/leaderboard?sessionId=X
    @GetMapping("/leaderboard")
    public ResponseEntity<Map<String, Object>> globalLeaderboard(
            @RequestParam(required = false) Long sessionId) {
        return ResponseEntity.ok(liveSessionService.getGlobalLeaderboard(sessionId));
    }

    // ── Co-host: Transfer host role ─────────────────────────────────────────────

    @PostMapping("/{sessionId}/transfer-host")
    public ResponseEntity<Map<String, String>> transferHost(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal String enterpriseId) {
        liveSessionService.transferHostToCohost(sessionId, enterpriseId);
        return ResponseEntity.ok(Map.of("message", "Host role transferred to co-host"));
    }

    // ── Session Recording: Get replay events ─────────────────────────────────────

    @GetMapping("/{sessionId}/replay")
    public ResponseEntity<List<Map<String, Object>>> getReplay(@PathVariable Long sessionId) {
        return ResponseEntity.ok(liveSessionService.getSessionReplay(sessionId));
    }

    // ── Team Leaderboard ─────────────────────────────────────────────────────────

    @GetMapping("/{sessionId}/team-leaderboard")
    public ResponseEntity<List<Map<String, Object>>> teamLeaderboard(@PathVariable Long sessionId) {
        return ResponseEntity.ok(liveSessionService.getTeamLeaderboard(sessionId));
    }

    // ── Invite Link ──────────────────────────────────────────────────────────────

    @GetMapping("/{sessionId}/invite-link")
    public ResponseEntity<Map<String, String>> getInviteLink(
            @PathVariable Long sessionId,
            @RequestHeader(value = "Origin", defaultValue = "http://localhost:3000") String origin) {
        return ResponseEntity.ok(liveSessionService.generateInviteLink(sessionId, origin));
    }
}
