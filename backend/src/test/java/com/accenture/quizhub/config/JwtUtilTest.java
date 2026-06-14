package com.accenture.quizhub.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(new StandardEnvironment());
        ReflectionTestUtils.setField(jwtUtil, "secret",
                "testSecretKeyForJunitTestingPurposesOnlyAtLeast256BitsLong");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 3600000L);
    }

    @Test
    void generateToken_shouldReturnNonNullToken() {
        String token = jwtUtil.generateToken("john.doe", "SME");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractEnterpriseId_shouldReturnCorrectSubject() {
        String token = jwtUtil.generateToken("john.doe", "SME");
        assertEquals("john.doe", jwtUtil.extractEnterpriseId(token));
    }

    @Test
    void extractRole_shouldReturnCorrectRole() {
        String token = jwtUtil.generateToken("john.doe", "ADMIN");
        assertEquals("ADMIN", jwtUtil.extractRole(token));
    }

    @Test
    void isTokenValid_shouldReturnTrueForValidToken() {
        String token = jwtUtil.generateToken("john.doe", "SME");
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void isTokenValid_shouldReturnFalseForTamperedToken() {
        String token = jwtUtil.generateToken("john.doe", "SME");
        String tampered = token + "garbage";
        assertFalse(jwtUtil.isTokenValid(tampered));
    }

    @Test
    void isTokenValid_shouldReturnFalseForExpiredToken() {
        // Set expiration to 1ms to force expiry
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 1L);
        String token = jwtUtil.generateToken("john.doe", "SME");
        // Give it time to expire
        try { Thread.sleep(10); } catch (InterruptedException ignored) {}
        assertFalse(jwtUtil.isTokenValid(token));
    }

    @Test
    void generateToken_differentUsersProduceDifferentTokens() {
        String token1 = jwtUtil.generateToken("user.one", "SME");
        String token2 = jwtUtil.generateToken("user.two", "SME");
        assertNotEquals(token1, token2);
    }
}
