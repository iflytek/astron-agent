package com.iflytek.astron.console.commons.util;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.web.multipart.MultipartFile;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * Audio file validation utility class Validates audio format, quality parameters, etc.
 *
 * @author bowang
 */
@Slf4j
public class AudioValidator {

    // Supported audio formats
    private static final List<String> SUPPORTED_FORMATS = Arrays.asList("wav", "mp3", "m4a", "pcm");

    // Audio quality requirements
    // mono channel
    private static final int REQUIRED_CHANNELS = 1;
    // 24kHz
    private static final float MIN_SAMPLE_RATE = 24000.0f;
    // 16bit
    private static final int REQUIRED_SAMPLE_SIZE = 16;
    // 40 seconds
    private static final int MAX_DURATION_SECONDS = 40;
    // 3MB
    private static final long MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

    /**
     * Validate audio file
     *
     * @param file uploaded file
     * @throws BusinessException throws business exception when validation fails
     */
    public static void validateAudioFile(MultipartFile file) throws BusinessException {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResponseEnum.FILE_EMPTY);
        }

        // 1. Check file format
        validateFileFormat(file);

        // 2. Check file size
        validateFileSize(file);

        // 3. Check audio properties
        validateAudioProperties(file);
    }

    /**
     * Validate file format
     */
    private static void validateFileFormat(MultipartFile file) throws BusinessException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new BusinessException(ResponseEnum.PARAM_MISS);
        }

        String extension = getFileExtension(filename).toLowerCase();
        if (!SUPPORTED_FORMATS.contains(extension)) {
            throw new BusinessException(ResponseEnum.AUDIO_FILE_FORMAT_UNSUPPORTED);
        }
    }

    /**
     * Validate file size
     */
    private static void validateFileSize(MultipartFile file) throws BusinessException {
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException(ResponseEnum.AUDIO_FILE_SIZE_EXCEEDED);
        }
    }

    /**
     * Validate audio properties
     */
    private static void validateAudioProperties(MultipartFile file) throws BusinessException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            return;
        }

        String extension = getFileExtension(filename).toLowerCase();

        try {
            // For WAV and PCM formats, Java Sound API can be used for detailed validation
            if ("wav".equals(extension) || "pcm".equals(extension)) {
                validateWavPcmProperties(file);
            } else if ("mp3".equals(extension) || "m4a".equals(extension)) {
                // For MP3 and M4A, only basic checks are performed currently
                // Java Sound API has limited support for these formats
                validateMp3M4aBasic(file);
            }
        } catch (IOException | UnsupportedAudioFileException e) {
            log.warn("Audio file validation failed: {}", e.getMessage());
            // For audio files that cannot be parsed, only basic checks are performed
            validateBasicAudioProperties(file);
        }
    }

    /**
     * Validate audio properties for WAV and PCM formats
     */
    private static void validateWavPcmProperties(MultipartFile file) throws IOException, UnsupportedAudioFileException, BusinessException {
        try (AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(file.getInputStream())) {
            AudioFormat format = getAudioFormat(audioInputStream);

            // Check duration (within 40 seconds)
            long frameLength = audioInputStream.getFrameLength();
            float frameRate = format.getFrameRate();
            if (frameRate > 0) {
                float durationSeconds = frameLength / frameRate;
                if (durationSeconds > MAX_DURATION_SECONDS) {
                    throw new BusinessException(ResponseEnum.AUDIO_DURATION_TOO_LONG);
                }
            }
        }
    }

    @NotNull
    private static AudioFormat getAudioFormat(AudioInputStream audioInputStream) {
        AudioFormat format = audioInputStream.getFormat();

        // Check number of channels (mono)
        if (format.getChannels() != REQUIRED_CHANNELS) {
            throw new BusinessException(ResponseEnum.AUDIO_CHANNELS_INVALID);
        }

        // Check sample rate (24kHz and above)
        if (format.getSampleRate() < MIN_SAMPLE_RATE) {
            throw new BusinessException(ResponseEnum.AUDIO_SAMPLE_RATE_TOO_LOW);
        }

        // Check bit depth (16bit)
        if (format.getSampleSizeInBits() != REQUIRED_SAMPLE_SIZE) {
            throw new BusinessException(ResponseEnum.AUDIO_BIT_DEPTH_INVALID);
        }
        return format;
    }

    /**
     * Validate basic properties for MP3 and M4A formats
     */
    private static void validateMp3M4aBasic(MultipartFile file) throws BusinessException {
        // For MP3 and M4A, only basic validation can be performed currently
        // Duration check is roughly estimated by file size (this is not a precise method, but it is a
        // reasonable approximation without specialized libraries)
        long fileSize = file.getSize();

        // Rough estimate: 16bit mono 24kHz audio is approximately 48KB per second
        // 40 seconds of audio is approximately 1.92MB, leaving some margin
        long estimatedMaxSizeForDuration = (long) (MAX_DURATION_SECONDS * 48000 * 1.5);

        if (fileSize > estimatedMaxSizeForDuration) {
            log.warn("Audio file size {} exceeds expected, may be too long", fileSize);
            // Do not throw exception because this is only a rough estimate
        }
    }

    /**
     * Validate basic audio properties (used when audio format cannot be parsed)
     */
    private static void validateBasicAudioProperties(MultipartFile file) throws BusinessException {
        // Basic validation: file size reasonableness check
        long fileSize = file.getSize();

        // Ensure file is not too small (at least 1KB)
        if (fileSize < 1024) {
            throw new BusinessException(ResponseEnum.PARAM_ERROR);
        }

        log.info("Audio file passed basic validation, filename: {}, size: {} bytes", file.getOriginalFilename(), fileSize);
    }

    /**
     * Get file extension
     */
    private static String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }
}
