package com.iflytek.astron.console.hub.util.wechat;

import java.util.Map;

/**
 * WeChat message parsing utility
 */
public class WXBizMsgParse {

    private static final String[] SYS_MSG_KEYS = {"AppId", "Encrypt"};
    private static final String[] USR_MSG_KEYS = {"ToUserName", "Encrypt"};
    private static final String[] VERIFY_TICKET_KEYS = {"AppId", "InfoType", "ComponentVerifyTicket", "CreateTime"};
    private static final String[] AUTHORIZED_KEYS = {"AppId", "InfoType", "AuthorizerAppid", "AuthorizationCode",
            "AuthorizationCodeExpiredTime", "PreAuthCode", "CreateTime"};
    private static final String[] UPDATEAUTHORIZED_KEYS = {"AppId", "InfoType", "AuthorizerAppid", "AuthorizationCode",
            "AuthorizationCodeExpiredTime", "PreAuthCode", "CreateTime"};
    private static final String[] UNAUTHORIZED_KEYS = {"AppId", "InfoType", "AuthorizerAppid", "CreateTime"};
    public static final String[] USER_MSG_KEYS = {"ToUserName", "FromUserName", "CreateTime", "MsgType", "Content", "MsgId"};
    public static final String[] EVENT_MSG_KEYS = {"ToUserName", "FromUserName", "CreateTime", "MsgType", "Event", "EventKey"};
    public static final String[] USER_EVENT_TYPE_KEYS = {"MsgType"};
    private static final String[] INFO_TYPE_KEYS = {"InfoType"};

    /**
     * Parse system event push notification message format in secure mode - Messages sent by WeChat
     * server to third-party platform itself (such as cancel authorization notification,
     * component_verify_ticket push, etc.) - At this time, there is no ToUserName field in the message
     * XML body, but AppId field, which is the AppId of the third-party platform
     *
     * @return Map
     */
    public static Map<String, String> parseSysMsg(String mingwen) throws AesException {
        return XMLParse.extract(mingwen, SYS_MSG_KEYS);
    }

    /**
     * Parse user message format sent to official account in secure mode - Messages sent by users to
     * official accounts/mini programs (received by third-party platform) - At this time, in the message
     * XML body, ToUserName (receiver) is the original ID of the official account/mini program
     *
     * @return Map
     */
    public static Map<String, String> parseUsrMsg(String mingwen) throws AesException {
        return XMLParse.extract(mingwen, USR_MSG_KEYS);
    }

    /**
     * Get message type
     *
     * @return String
     */
    public static String getInfoType(String decrypted) throws AesException {
        return XMLParse.extract(decrypted, INFO_TYPE_KEYS).get("InfoType");
    }

    public static String getEventType(String decrypted) throws AesException {
        return XMLParse.extract(decrypted, USER_EVENT_TYPE_KEYS).get("MsgType");
    }

    /**
     * Parse verify ticket (component_verify_ticket) message format Parameters: - AppId: Third-party
     * platform appid - CreateTime: Timestamp, unit: s - InfoType: Fixed as: "component_verify_ticket" -
     * ComponentVerifyTicket: Ticket content
     *
     * @return Map
     */
    public static Map<String, String> parseTicketMsg(String postData) throws AesException {
        return XMLParse.extract(postData, VERIFY_TICKET_KEYS);
    }

    /**
     * Parse authorization success (authorized) message format Parameters: - AppId: Third-party platform
     * appid - CreateTime: Timestamp, unit: s - InfoType: Fixed as: "authorized" - AuthorizerAppid:
     * Official account appid - AuthorizationCode: Authorization code - AuthorizationCodeExpiredTime:
     * Expiration time - PreAuthCode: Pre-authorization code
     *
     * @return Map
     */
    public static Map<String, String> parseAuthorizedMsg(String postData) throws AesException {
        return XMLParse.extract(postData, AUTHORIZED_KEYS);
    }

    /**
     * Parse update authorization (updateauthorized) message format Parameters: - AppId: Third-party
     * platform appid - CreateTime: Timestamp, unit: s - InfoType: Fixed as: "updateauthorized" -
     * AuthorizerAppid: Official account appid - AuthorizationCode: Authorization code -
     * AuthorizationCodeExpiredTime: Expiration time - PreAuthCode: Pre-authorization code
     *
     * @return Map
     */
    public static Map<String, String> parseUpdateauthorizedMsg(String postData) throws AesException {
        return XMLParse.extract(postData, UPDATEAUTHORIZED_KEYS);
    }

    /**
     * Parse cancel authorization (unauthorized) message format Parameters: - AppId: Third-party
     * platform appid - CreateTime: Timestamp, unit: s - InfoType: Fixed as: "unauthorized" -
     * AuthorizerAppid: Official account appid
     *
     * @return Map
     */
    public static Map<String, String> parseUnauthorizedMsg(String postData) throws AesException {
        return XMLParse.extract(postData, UNAUTHORIZED_KEYS);
    }

    public static Map<String, String> parseEventMsg(String decrypted) throws AesException {
        return XMLParse.extract(decrypted, EVENT_MSG_KEYS);
    }

    public static Map<String, String> parseUserMsg(String postData) throws AesException {
        return XMLParse.extract(postData, USER_MSG_KEYS);
    }
}
