package com.iflytek.astron.console.hub.service.chat.springai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ChatModelFactoryTest {

    @Test
    void mapsSparkModelNamesToOpenAiModelIds() {
        assertEquals("x1", ChatModelFactory.sparkModelToOpenAiModelId("spark-x1"));
        assertEquals("generalv3.5", ChatModelFactory.sparkModelToOpenAiModelId("spark-max"));
    }

    @Test
    void unknownSparkNameFallsBackToOriginal() {
        assertEquals("foo", ChatModelFactory.sparkModelToOpenAiModelId("foo"));
    }
}
