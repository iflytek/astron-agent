package com.iflytek.astron.console.hub.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.concurrent.TimeUnit;

class AESUtilTest {

    private static final String KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    @Timeout(value = 5, unit = TimeUnit.SECONDS)
    void encryptShouldRoundTripWithoutBlockingStrongRandom() {
        String plainText = "enterprise invitation";

        String firstCipherText = AESUtil.encrypt(plainText, KEY);
        String secondCipherText = AESUtil.encrypt(plainText, KEY);

        assertEquals(plainText, AESUtil.decrypt(firstCipherText, KEY));
        assertEquals(plainText, AESUtil.decrypt(secondCipherText, KEY));
        assertNotEquals(firstCipherText, secondCipherText);
    }
}
