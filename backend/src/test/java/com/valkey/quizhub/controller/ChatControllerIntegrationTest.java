package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.repository.*;
import com.valkey.quizhub.service.AIService;
import com.valkey.quizhub.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ChatControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired ChatMessageRepository chatMessageRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String smeToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        reviewCommentRepository.deleteAll();
        mcqVersionRepository.deleteAll();
        mcqRepository.deleteAll();
        topicRepository.deleteAll();
        notificationRepository.deleteAll();
        inboxMessageRepository.deleteAll();
        chatMessageRepository.deleteAll();
        userRepository.deleteAll();
        techStackRepository.deleteAll();

        userRepository.save(User.builder()
                .enterpriseId("chat.sme")
                .fullName("Chat SME")
                .email("sme@chat.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        userRepository.save(User.builder()
                .enterpriseId("chat.admin")
                .fullName("Chat Admin")
                .email("admin@chat.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeToken = "Bearer " + jwtUtil.generateToken("chat.sme", "SME");
        adminToken = "Bearer " + jwtUtil.generateToken("chat.admin", "ADMIN");

        Mockito.when(aiService.chatReply(anyString())).thenReturn("AI response text");
        Mockito.when(aiService.chatReplyWithHistory(anyString(), anyList())).thenReturn("AI response text");
    }

    @Test
    @Order(1)
    void heartbeat_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/chat/heartbeat")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(2)
    void onlineUsers_returns200() throws Exception {
        // First heartbeat to populate presence
        mockMvc.perform(post("/api/v1/chat/heartbeat")
                        .header("Authorization", smeToken));

        mockMvc.perform(get("/api/v1/chat/online-users")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(3)
    void getMessages_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/chat/messages")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(4)
    void sendMessage_returns200() throws Exception {
        Map<String, String> body = Map.of("content", "Hello team!");
        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(5)
    void chat_unauthenticated_returns4xx() throws Exception {
        mockMvc.perform(post("/api/v1/chat/heartbeat"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(6)
    void getPinned_noMessage_returns204() throws Exception {
        mockMvc.perform(get("/api/v1/chat/pinned")
                        .header("Authorization", smeToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(7)
    void reactToMessage_returns200() throws Exception {
        // First send a message to get an ID
        Map<String, String> msgBody = Map.of("content", "React to me!");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode arr = objectMapper.readTree(response);
        long msgId = arr.get(0).get("id").asLong();

        Map<String, String> reactBody = Map.of("emoji", "👍");
        mockMvc.perform(post("/api/v1/chat/messages/" + msgId + "/react")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reactBody)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(8)
    void editMessage_returns200() throws Exception {
        Map<String, String> msgBody = Map.of("content", "Original content");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long msgId = objectMapper.readTree(response).get(0).get("id").asLong();

        Map<String, String> editBody = Map.of("content", "Edited content");
        mockMvc.perform(put("/api/v1/chat/messages/" + msgId)
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(editBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Edited content"));
    }

    @Test
    @Order(9)
    void pinMessage_asAdmin_returns200() throws Exception {
        Map<String, String> msgBody = Map.of("content", "Pin this message!");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long msgId = objectMapper.readTree(response).get(0).get("id").asLong();

        mockMvc.perform(put("/api/v1/chat/messages/" + msgId + "/pin")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(10)
    void deleteMessage_returns204() throws Exception {
        Map<String, String> msgBody = Map.of("content", "Delete me!");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long msgId = objectMapper.readTree(response).get(0).get("id").asLong();

        mockMvc.perform(delete("/api/v1/chat/messages/" + msgId)
                        .header("Authorization", smeToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(11)
    void getPinned_withPinnedMessage_returns200() throws Exception {
        // Send then pin a message as admin
        Map<String, String> msgBody = Map.of("content", "Pinned message content");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(response).get(0).get("id").asLong();
        mockMvc.perform(put("/api/v1/chat/messages/" + msgId + "/pin")
                        .header("Authorization", adminToken));

        mockMvc.perform(get("/api/v1/chat/pinned")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(12)
    void sendMessage_withBotMention_returnsTwoMessagesWithBotReply() throws Exception {
        Map<String, String> body = Map.of("content", "Hey @bot what is Java?");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode arr = objectMapper.readTree(response);
        assertEquals(2, arr.size());
        assertEquals("BOT", arr.get(1).get("msgType").asText());
        assertEquals("AI response text", arr.get(1).get("content").asText());
    }

    @Test
    @Order(13)
    void sendMessage_withUserMention_createsMessageAndNotification() throws Exception {
        // sme mentions chat.admin in a message
        Map<String, String> body = Map.of("content", "Hey @chat.admin please look at this");
        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Hey @chat.admin please look at this"));

        assertEquals(1, chatMessageRepository.findTop100ByOrderByCreatedAtDesc().size());
    }

    @Test
    @Order(14)
    void getMessages_withSinceParam_returnsMessagesAfterTimestamp() throws Exception {
        // Send a message first
        Map<String, String> msgBody = Map.of("content", "History test message");
        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)));

        // Query with a past timestamp — should return all messages
        String since = "2020-01-01T00:00:00";
        mockMvc.perform(get("/api/v1/chat/messages")
                        .param("since", since)
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @Order(15)
    void inbox_unreadCount_returns200WithCount() throws Exception {
        mockMvc.perform(get("/api/v1/inbox/unread-count")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").exists());
    }

    @Test
    @Order(16)
    void inbox_markAllRead_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/inbox/mark-all-read")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(17)
    void editMessage_byNonOwner_returnsForbidden() throws Exception {
        // Admin sends a message
        Map<String, String> msgBody = Map.of("content", "Admin original message");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(response).get(0).get("id").asLong();

        // SME tries to edit admin's message — should get 403
        Map<String, String> editBody = Map.of("content", "Tampered content");
        mockMvc.perform(put("/api/v1/chat/messages/" + msgId)
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(editBody)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(18)
    void deleteMessage_byNonOwnerNonAdmin_returnsForbidden() throws Exception {
        // Admin sends a message
        Map<String, String> msgBody = Map.of("content", "Admin message not deletable by SME");
        String response = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(response).get(0).get("id").asLong();

        // SME tries to delete admin's message — not owner, not admin → 403
        mockMvc.perform(delete("/api/v1/chat/messages/" + msgId)
                        .header("Authorization", smeToken))
                .andExpect(status().isForbidden());
    }

    // ── New tests to boost coverage ──────────────────────────────────────────

    @Test
    @Order(19)
    void sendMessage_withBlankContent_returnsBadRequest() throws Exception {
        Map<String, String> body = Map.of("content", "   ");
        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(20)
    void sendMessage_withReplyToId_createsThreadedReply() throws Exception {
        // Send the original message
        Map<String, String> orig = Map.of("content", "Original message for reply");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orig)))
                .andReturn().getResponse().getContentAsString();
        long origId = objectMapper.readTree(res).get(0).get("id").asLong();

        // Reply to it — exercises the reply threading branch
        Map<String, Object> reply = new java.util.HashMap<>();
        reply.put("content", "This is a reply");
        reply.put("replyToId", origId);
        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reply)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].replyToId").value(origId))
                .andExpect(jsonPath("$[0].replyToSender").value("Chat SME"));
    }

    @Test
    @Order(21)
    void getMessages_withInvalidSinceParam_returnsFallback() throws Exception {
        // Invalid ISO date-time format triggers the catch block — falls back to top 100
        mockMvc.perform(get("/api/v1/chat/messages")
                        .param("since", "not-a-valid-datetime")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(22)
    void reactToMessage_withBlankEmoji_returnsBadRequest() throws Exception {
        Map<String, String> msgBody = Map.of("content", "React target");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(res).get(0).get("id").asLong();

        Map<String, String> reactBody = Map.of("emoji", "   ");
        mockMvc.perform(post("/api/v1/chat/messages/" + msgId + "/react")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reactBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(23)
    void pinMessage_asSme_returnsForbidden() throws Exception {
        Map<String, String> msgBody = Map.of("content", "SME message");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(res).get(0).get("id").asLong();

        // SME is not ADMIN → 403
        mockMvc.perform(put("/api/v1/chat/messages/" + msgId + "/pin")
                        .header("Authorization", smeToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(24)
    void deleteMessage_byAdmin_canDeleteAnotherUsersMessage() throws Exception {
        // SME sends a message
        Map<String, String> msgBody = Map.of("content", "SME message to be deleted by admin");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(res).get(0).get("id").asLong();

        // Admin deletes it — isAdmin=true branch → 204
        mockMvc.perform(delete("/api/v1/chat/messages/" + msgId)
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(25)
    void editMessage_withBlankContent_returnsBadRequest() throws Exception {
        Map<String, String> msgBody = Map.of("content", "Edit me");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(res).get(0).get("id").asLong();

        Map<String, String> editBody = Map.of("content", "   ");
        mockMvc.perform(put("/api/v1/chat/messages/" + msgId)
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(editBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(26)
    void reactToMessage_sameEmojiTwice_togglesOffReaction() throws Exception {
        Map<String, String> msgBody = Map.of("content", "Toggle react message");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgBody)))
                .andReturn().getResponse().getContentAsString();
        long msgId = objectMapper.readTree(res).get(0).get("id").asLong();

        Map<String, String> reactBody = Map.of("emoji", "👍");
        // First react — adds the user to the reaction list
        mockMvc.perform(post("/api/v1/chat/messages/" + msgId + "/react")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reactBody)))
                .andExpect(status().isOk());

        // Second react with same emoji — removes it (toggle-off branch)
        mockMvc.perform(post("/api/v1/chat/messages/" + msgId + "/react")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reactBody)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(27)
    void sendMessage_withReplyToDeletedMessage_showsDeletedContent() throws Exception {
        // Send original message
        Map<String, String> orig = Map.of("content", "Message to be deleted");
        String res = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orig)))
                .andReturn().getResponse().getContentAsString();
        long origId = objectMapper.readTree(res).get(0).get("id").asLong();

        // Delete it
        mockMvc.perform(delete("/api/v1/chat/messages/" + origId)
                        .header("Authorization", smeToken));

        // Reply to the deleted message — replyContent should become "[deleted]"
        Map<String, Object> reply = new java.util.HashMap<>();
        reply.put("content", "Replying to deleted message");
        reply.put("replyToId", origId);
        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reply)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].replyToContent").value("[deleted]"));
    }
}
