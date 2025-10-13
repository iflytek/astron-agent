package com.iflytek.astron.console.commons.event;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Simple event test to verify event object creation and property access
 */
public class UserNicknameEventSimpleTest {

    @Test
    public void testUserNicknameUpdatedEventCreation() {
        // Prepare test data
        String testUid = "test-uid-123";
        String oldNickname = "Old Nickname";
        String newNickname = "New Nickname";
        Object source = new Object();

        // Create event
        UserNicknameUpdatedEvent event = new UserNicknameUpdatedEvent(source, testUid, oldNickname, newNickname);

        // Verify event properties
        assertNotNull(event);
        assertEquals(source, event.getSource());
        assertEquals(testUid, event.getUid());
        assertEquals(oldNickname, event.getOldNickname());
        assertEquals(newNickname, event.getNewNickname());
    }

    @Test
    public void testUserNicknameUpdatedEventWithNullValues() {
        // Test null values
        String testUid = null;
        String oldNickname = null;
        String newNickname = "New Nickname";
        Object source = new Object();

        // Create event
        UserNicknameUpdatedEvent event = new UserNicknameUpdatedEvent(source, testUid, oldNickname, newNickname);

        // Verify event properties
        assertNotNull(event);
        assertEquals(source, event.getSource());
        assertEquals(testUid, event.getUid());
        assertEquals(oldNickname, event.getOldNickname());
        assertEquals(newNickname, event.getNewNickname());
    }

    @Test
    public void testUserNicknameUpdatedEventWithEmptyStrings() {
        // Test empty strings
        String testUid = "";
        String oldNickname = "";
        String newNickname = "";
        Object source = new Object();

        // Create event
        UserNicknameUpdatedEvent event = new UserNicknameUpdatedEvent(source, testUid, oldNickname, newNickname);

        // Verify event properties
        assertNotNull(event);
        assertEquals(source, event.getSource());
        assertEquals(testUid, event.getUid());
        assertEquals(oldNickname, event.getOldNickname());
        assertEquals(newNickname, event.getNewNickname());
    }
}
