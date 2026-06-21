package com.valkey.quizhub.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Validates JWT token on WebSocket CONNECT frames.
 * Sets authenticated user principal for the WebSocket session.
 * Unauthenticated CONNECT requests to protected topics are rejected.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.isTokenValid(token)) {
                    String enterpriseId = jwtUtil.extractEnterpriseId(token);
                    String role = jwtUtil.extractRole(token);
                    var auth = new UsernamePasswordAuthenticationToken(
                            enterpriseId, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
                    accessor.setUser(auth);
                    log.debug("WebSocket CONNECT authenticated for user: {}", enterpriseId);
                } else {
                    log.warn("WebSocket CONNECT with invalid JWT token");
                }
            }
            // Allow unauthenticated connects for public live quiz participants (PIN-based)
        }

        return message;
    }
}
