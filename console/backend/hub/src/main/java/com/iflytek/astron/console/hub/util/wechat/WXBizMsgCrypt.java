package com.iflytek.astron.console.hub.util.wechat;

import org.apache.commons.codec.binary.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Random;

/**
 * Provides interfaces for receiving and pushing encrypted/decrypted messages to/from WeChat
 * platform (UTF8 encoded strings).
 * <ol>
 * <li>Third-party replies encrypted messages to WeChat platform</li>
 * <li>Third-party receives messages from WeChat platform, verifies message security, and decrypts
 * messages.</li>
 * </ol>
 */
public class WXBizMsgCrypt {
    static Charset CHARSET = StandardCharsets.UTF_8;
    Base64 base64 = new Base64();
    byte[] aesKey;
    String token;
    String appId;

    /**
     * Constructor
     *
     * @param token Token set by developer on WeChat platform
     * @param encodingAesKey EncodingAESKey set by developer on WeChat platform
     * @param appId WeChat platform appid
     * @throws AesException Execution failed, please check the error code and specific error message of
     *         this exception
     */
    public WXBizMsgCrypt(String token, String encodingAesKey, String appId) throws AesException {
        this(token, validateAndDecodeAesKey(encodingAesKey), appId);
    }

    /**
     * Private constructor that doesn't throw exceptions
     */
    private WXBizMsgCrypt(String token, byte[] aesKey, String appId) {
        this.token = token;
        this.aesKey = aesKey;
        this.appId = appId;
    }

    /**
     * Validate and decode AES key
     */
    private static byte[] validateAndDecodeAesKey(String encodingAesKey) throws AesException {
        if (encodingAesKey.length() != 43) {
            throw new AesException(AesException.IllegalAesKey);
        }
        return Base64.decodeBase64(encodingAesKey + "=");
    }

    // Generate 4-byte network byte order
    byte[] getNetworkBytesOrder(int sourceNumber) {
        byte[] orderBytes = new byte[4];
        orderBytes[3] = (byte) (sourceNumber & 0xFF);
        orderBytes[2] = (byte) (sourceNumber >> 8 & 0xFF);
        orderBytes[1] = (byte) (sourceNumber >> 16 & 0xFF);
        orderBytes[0] = (byte) (sourceNumber >> 24 & 0xFF);
        return orderBytes;
    }

    // Restore 4-byte network byte order
    int recoverNetworkBytesOrder(byte[] orderBytes) {
        int sourceNumber = 0;
        for (int i = 0; i < 4; i++) {
            sourceNumber <<= 8;
            sourceNumber |= orderBytes[i] & 0xff;
        }
        return sourceNumber;
    }

    // Randomly generate 16-character string
    String getRandomStr() {
        String base = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            int number = random.nextInt(base.length());
            sb.append(base.charAt(number));
        }
        return sb.toString();
    }

    /**
     * Encrypt plaintext.
     *
     * @param text Plaintext to be encrypted
     * @return Base64 encoded string after encryption
     * @throws AesException AES encryption failed
     */
    String encrypt(String randomStr, String text) throws AesException {
        ByteGroup byteCollector = new ByteGroup();
        byte[] randomStrBytes = randomStr.getBytes(CHARSET);
        byte[] textBytes = text.getBytes(CHARSET);
        byte[] networkBytesOrder = getNetworkBytesOrder(textBytes.length);
        byte[] appidBytes = appId.getBytes(CHARSET);

        // randomStr + networkBytesOrder + text + appid
        byteCollector.addBytes(randomStrBytes);
        byteCollector.addBytes(networkBytesOrder);
        byteCollector.addBytes(textBytes);
        byteCollector.addBytes(appidBytes);

        // ... + pad: Use custom padding method to pad plaintext
        byte[] padBytes = PKCS7Encoder.encode(byteCollector.size());
        byteCollector.addBytes(padBytes);

        // Get final byte stream, unencrypted
        byte[] unencrypted = byteCollector.toBytes();

        try {
            // Set encryption mode to AES CBC mode
            Cipher cipher = Cipher.getInstance("AES/CBC/NoPadding");
            SecretKeySpec keySpec = new SecretKeySpec(aesKey, "AES");
            IvParameterSpec iv = new IvParameterSpec(aesKey, 0, 16);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, iv);

            // Encrypt
            byte[] encrypted = cipher.doFinal(unencrypted);

            // Use BASE64 to encode encrypted string
            String base64Encrypted = base64.encodeToString(encrypted);

            return base64Encrypted;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AesException(AesException.EncryptAESError);
        }
    }

    /**
     * Decrypt ciphertext.
     *
     * @param text Ciphertext to be decrypted
     * @return Decrypted plaintext
     * @throws AesException AES decryption failed
     */
    String decrypt(String text) throws AesException {
        byte[] original;
        try {
            // Set decryption mode to AES CBC mode
            Cipher cipher = Cipher.getInstance("AES/CBC/NoPadding");
            SecretKeySpec key_spec = new SecretKeySpec(aesKey, "AES");
            IvParameterSpec iv = new IvParameterSpec(Arrays.copyOfRange(aesKey, 0, 16));
            cipher.init(Cipher.DECRYPT_MODE, key_spec, iv);

            // Use BASE64 to decode ciphertext
            byte[] encrypted = Base64.decodeBase64(text);

            // Decrypt
            original = cipher.doFinal(encrypted);
        } catch (Exception e) {
            e.printStackTrace();
            throw new AesException(AesException.DecryptAESError);
        }

        String xmlContent, from_appid;
        try {
            // Remove padding
            byte[] bytes = PKCS7Encoder.decode(original);

            // Separate 16-bit random string, network byte order, and appId
            byte[] networkOrder = Arrays.copyOfRange(bytes, 16, 20);

            int xmlLength = recoverNetworkBytesOrder(networkOrder);

            xmlContent = new String(Arrays.copyOfRange(bytes, 20, 20 + xmlLength), CHARSET);
            from_appid = new String(Arrays.copyOfRange(bytes, 20 + xmlLength, bytes.length),
                    CHARSET);
        } catch (Exception e) {
            e.printStackTrace();
            throw new AesException(AesException.IllegalBuffer);
        }

        // Verify appid
        if (!from_appid.equals(appId)) {
            throw new AesException(AesException.ValidateAppidError);
        }
        return xmlContent;

    }

    /**
     * Verify URL
     *
     * @param msgSignature Signature string
     * @param timeStamp Timestamp
     * @param nonce Random number
     * @param echoStr Random string
     * @return Decrypted echostr
     * @throws AesException Execution failed, please check the error code and specific error message of
     *         this exception
     */
    public String verifyUrl(String msgSignature, String timeStamp, String nonce, String echoStr)
            throws AesException {
        String signature = getSHA1(token, timeStamp, nonce, echoStr);

        if (!signature.equals(msgSignature)) {
            throw new AesException(AesException.ValidateSignatureError);
        }

        String result = decrypt(echoStr);
        return result;
    }

    /**
     * Decrypt message
     *
     * @param msgSignature Signature string
     * @param timeStamp Timestamp
     * @param nonce Random number
     * @param postData Encrypted XML
     * @return Decrypted XML
     * @throws AesException Execution failed, please check the error code and specific error message of
     *         this exception
     */
    public String decryptMsg(String msgSignature, String timeStamp, String nonce, String postData)
            throws AesException {

        // Extract encrypted message
        Object[] encrypt = XMLParse.extract(postData, new String[] {"Encrypt"}).values().toArray();

        String signature = getSHA1(token, timeStamp, nonce, encrypt[0].toString());

        // Verify signature
        if (!signature.equals(msgSignature)) {
            throw new AesException(AesException.ValidateSignatureError);
        }

        // Decrypt
        String result = decrypt(encrypt[0].toString());
        return result;
    }

    /**
     * Encrypt message
     *
     * @param replyMsg Message to be encrypted
     * @param timeStamp Timestamp
     * @param nonce Random string
     * @return Encrypted XML
     * @throws AesException Execution failed, please check the error code and specific error message of
     *         this exception
     */
    public String encryptMsg(String replyMsg, String timeStamp, String nonce) throws AesException {
        // Encrypt
        String encrypt = encrypt(getRandomStr(), replyMsg);

        // Generate signature
        String signature = getSHA1(token, timeStamp, nonce, encrypt);

        // Generate XML
        String result = XMLParse.generate(encrypt, signature, timeStamp, nonce);
        return result;
    }

    /**
     * Calculate SHA1 signature
     */
    public String getSHA1(String token, String timestamp, String nonce, String encrypt) throws AesException {
        try {
            String[] array = new String[] {token, timestamp, nonce, encrypt};
            StringBuilder sb = new StringBuilder();
            // String sorting
            Arrays.sort(array);
            for (int i = 0; i < 4; i++) {
                sb.append(array[i]);
            }
            String str = sb.toString();
            // SHA1 signature generation
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            md.update(str.getBytes(CHARSET));
            byte[] digest = md.digest();

            StringBuilder hexstr = new StringBuilder();
            String shaHex = "";
            for (int i = 0; i < digest.length; i++) {
                shaHex = Integer.toHexString(digest[i] & 0xFF);
                if (shaHex.length() < 2) {
                    hexstr.append(0);
                }
                hexstr.append(shaHex);
            }
            return hexstr.toString();
        } catch (Exception e) {
            e.printStackTrace();
            throw new AesException(AesException.ComputeSignatureError);
        }
    }

    /**
     * Byte group utility class
     */
    static class ByteGroup {
        java.util.ArrayList<Byte> byteContainer = new java.util.ArrayList<Byte>();

        public byte[] toBytes() {
            byte[] bytes = new byte[byteContainer.size()];
            for (int i = 0; i < byteContainer.size(); i++) {
                bytes[i] = byteContainer.get(i);
            }
            return bytes;
        }

        public void addBytes(byte[] bytes) {
            for (byte b : bytes) {
                byteContainer.add(b);
            }
        }

        public int size() {
            return byteContainer.size();
        }
    }

    /**
     * PKCS7 encoding utility class
     */
    static class PKCS7Encoder {
        static int BLOCK_SIZE = 32;

        /**
         * Get padding array
         *
         * @param count Number of bytes to pad
         * @return Padding array
         */
        static byte[] encode(int count) {
            // Calculate number of bytes to pad
            int amountToPad = BLOCK_SIZE - (count % BLOCK_SIZE);
            if (amountToPad == 0) {
                amountToPad = BLOCK_SIZE;
            }
            // Get padding character
            char padChr = chr(amountToPad);
            StringBuilder tmp = new StringBuilder(amountToPad);
            for (int index = 0; index < amountToPad; index++) {
                tmp.append(padChr);
            }
            return tmp.toString().getBytes(CHARSET);
        }

        /**
         * Remove padding characters
         *
         * @param decrypted Decrypted byte array
         * @return Byte array after removing padding
         */
        static byte[] decode(byte[] decrypted) {
            int pad = (int) decrypted[decrypted.length - 1];
            if (pad < 1 || pad > 32) {
                pad = 0;
            }
            return Arrays.copyOfRange(decrypted, 0, decrypted.length - pad);
        }

        /**
         * Convert number to character
         *
         * @param a Number to convert
         * @return Character
         */
        static char chr(int a) {
            byte target = (byte) (a & 0xFF);
            return (char) target;
        }
    }
}
