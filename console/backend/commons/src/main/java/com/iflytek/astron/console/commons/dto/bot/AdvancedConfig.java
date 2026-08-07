package com.iflytek.astron.console.commons.dto.bot;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
public class AdvancedConfig {

    private Prologue prologue;

    private String backgroundPic;


    private TextToSpeech textToSpeech;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TextToSpeech {
        private boolean enabled;
        private String vcn_cn;
        private String vcn_en;

    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Prologue {

        private boolean enabled;

        private String prologueText;

        private List<String> inputExample;
    }

    public AdvancedConfig(String prologueText, List<String> inputExample, String backgroundPic, TextToSpeech textToSpeech) {
        this.prologue = new Prologue(Boolean.TRUE, prologueText, inputExample);
        this.backgroundPic = backgroundPic;
        this.textToSpeech = textToSpeech;
    }
}
