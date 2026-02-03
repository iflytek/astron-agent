-- lua/auth_handler.lua

local http = require("resty.http")
local json = require("cjson")
local ngx_log = ngx.log
local ngx_DEBUG = ngx.DEBUG -- 用于详细调试
local ngx_ERR = ngx.ERR
local ngx_WARN = ngx.WARN
local ngx_HTTP_OK = ngx.HTTP_OK
local ngx_HTTP_UNAUTHORIZED = ngx.HTTP_UNAUTHORIZED
local ngx_HTTP_INTERNAL_SERVER_ERROR = ngx.HTTP_INTERNAL_SERVER_ERROR

-- 定义一个函数来处理认证逻辑
local function authenticate_user()
    local ctx_type = ngx.var.context_type or "HTTP"
    ngx_log(ngx_DEBUG, "Starting authentication for " .. ctx_type .. " request. URI: " .. ngx.var.request_uri)

    local session_token = nil
    local cookie_type = nil -- 记录从哪个 cookie 获取的 token (SESSION 或 JSESSIONID)

    -- 1. 尝试从 Authorization header 获取 Bearer Token
    local authorization_header = ngx.req.get_headers()["authorization"] -- 注意，headers 都是小写键
    if authorization_header then
        ngx_log(ngx_DEBUG, "Found Authorization header: " .. authorization_header)
        local _, _, token_type, token_value = string.find(authorization_header, "^(%S+)%s+(.+)$")
        if token_type and token_type:lower() == "bearer" then
            -- session_token = token_value
            -- ngx_log(ngx_DEBUG, "Extracted Bearer Token from Authorization header: " .. session_token)
            return
        else
            ngx_log(ngx_DEBUG, "Authorization header is present but not Bearer type, type: " .. (token_type or "nil"))
        end
    else
        ngx_log(ngx_DEBUG, "No Authorization header found.")
    end

    -- 2. 如果 Authorization header 没有，尝试从自定义 'token' header 获取 (例如 X-Token 或 Token)
    -- 假设你的 'http_token' 对应的是名为 'Token' 的自定义头
    if not session_token then
        local custom_token_header = ngx.req.get_headers()["token"]
        if custom_token_header then
            session_token = custom_token_header
            ngx_log(ngx_DEBUG, "Extracted Token from custom 'Token' header: " .. session_token)
        else
            ngx_log(ngx_DEBUG, "No custom 'Token' header found.")
        end
    end

    -- 3. 如果还没有token，尝试从Cookie中获取 SESSION 或 JSESSIONID
    if not session_token then
        local cookie_header = ngx.var.http_cookie
        if cookie_header then
            ngx_log(ngx_DEBUG, "Found Cookie header: " .. cookie_header)
            -- 解析Cookie，优先查找 SESSION，然后查找 JSESSIONID
            for cookie_pair in string.gmatch(cookie_header, "[^;]+") do
                local cookie_name, cookie_value = string.match(cookie_pair, "^%s*(.-)%s*=%s*(.-)%s*$")
                if cookie_name == "SESSION" then
                    session_token = cookie_value
                    cookie_type = "SESSION"
                    ngx_log(ngx_DEBUG, "Extracted Token from Cookie SESSION: " .. session_token)
                    break
                elseif cookie_name == "JSESSIONID" then
                    session_token = cookie_value
                    cookie_type = "JSESSIONID"
                    ngx_log(ngx_DEBUG, "Extracted Token from Cookie JSESSIONID: " .. session_token)
                    break
                end
            end
            if not session_token then
                ngx_log(ngx_DEBUG, "Cookie header present but no SESSION or JSESSIONID found.")
            end
        else
            ngx_log(ngx_DEBUG, "No Cookie header found.")
        end
    end

    -- 4. 如果还是没有 token，尝试从查询参数中获取 API Key (支持 MCP 和其他 API Key 认证)
    if not session_token then
        local args = ngx.req.get_uri_args()
        if args.key then
            session_token = args.key
            ngx_log(ngx_DEBUG, "Extracted Token from query parameter 'key': " .. session_token)
        else
            ngx_log(ngx_DEBUG, "No query parameter 'key' found.")
        end
    end

    if not session_token or session_token == "" or session_token == " " then
        ngx_log(ngx_ERR, "Missing SESSION/Token in " .. ctx_type .. " request after trying all sources.")
        ngx.status = ngx_HTTP_UNAUTHORIZED
        ngx.say(json.encode({code = "4001", msg = "Missing SESSION/Token in request"}))
        return ngx.exit(ngx_HTTP_UNAUTHORIZED)
    end

    ngx_log(ngx_DEBUG, "Successfully extracted session_token: '" .. session_token .. "'")

    -- 调用 robot-service 进行认证
    local getUserUrl = "http://robot-service:8040/api/robot/user/info"
    local httpc = http.new()

    -- 准备发送给 robot-service 的 Headers
    -- 使用Cookie方式传递SESSION或JSESSIONID给robot-service
    -- 根据获取到的 cookie 类型来决定发送哪个 cookie
    local cookie_name_for_service = cookie_type or "JSESSIONID" -- 如果是从其他来源获取的，默认使用 JSESSIONID
    local headers_to_robot_service = {
        ["Content-Type"] = "application/json",
        -- 示例：如果 robot-service 期望 Authorization 头
        -- ["Authorization"] = "Bearer " .. session_token,
        -- 根据 cookie 类型发送相应的 cookie
        ["Cookie"] = cookie_name_for_service .. "=" .. session_token
    }

    ngx_log(ngx_DEBUG, "Calling robot-service (" .. getUserUrl .. ") with headers: " .. json.encode(headers_to_robot_service))

    local res, err = httpc:request_uri(getUserUrl, {
        method = "GET",
        headers = headers_to_robot_service,
        ssl_verify_host = false, -- 内部通信通常不需要 SSL 验证
        ssl_verify_peer = false,
        read_timeout = 5000,
        connect_timeout = 5000
    })

    if err then
        ngx_log(ngx_ERR, "Failed to connect to robot-service for " .. ctx_type .. " auth: " .. err .. ", URL: " .. getUserUrl)
        ngx.status = ngx_HTTP_INTERNAL_SERVER_ERROR
        ngx.say(json.encode({code = "5000", message = "Internal Server Error: Auth service unavailable"}))
        return ngx.exit(ngx_HTTP_INTERNAL_SERVER_ERROR)
    end

    ngx_log(ngx_DEBUG, "robot-service response status: " .. res.status .. ", body (first 200 chars): " .. (res.body and string.sub(res.body, 1, 200) or "No body"))

    if res.status ~= ngx_HTTP_OK then
        ngx_log(ngx_ERR, "robot-service returned unexpected status " .. res.status .. " for " .. ctx_type .. " auth, full body: " .. (res.body or "No body"))
        ngx.status = res.status
        ngx.say(res.body) -- 将 robot-service 的错误响应直接返回
        return ngx.exit(res.status)
    end

    local userResponse, json_err = json.decode(res.body)
    if json_err then
        ngx_log(ngx_ERR, "Failed to decode robot-service response for " .. ctx_type .. " auth: " .. json_err .. ", full body: " .. (res.body or "No body"))
        ngx.status = ngx_HTTP_INTERNAL_SERVER_ERROR
        ngx.say(json.encode({code = "5000", message = "Internal Server Error: Invalid auth service response"}))
        return ngx.exit(ngx_HTTP_INTERNAL_SERVER_ERROR)
    end

    ngx_log(ngx_DEBUG, "Decoded robot-service response: " .. json.encode(userResponse))

    -- robot-service 成功时返回 code 为 "000000" (字符串) 或 200 (数字)
    local response_code = userResponse.code
    local is_success = (response_code == "000000") or (response_code == 200) or (tostring(response_code) == "000000")
    
    if not is_success then
        ngx_log(ngx_ERR, "robot-service returned error code: " .. (response_code or "nil") .. ", message: " .. (userResponse.message or "nil") .. " for " .. ctx_type .. " auth. Full response: " .. json.encode(userResponse))
        ngx.status = ngx_HTTP_UNAUTHORIZED
        ngx.say(json.encode({
            code = response_code or "U_AUTH_FAIL",
            data = userResponse.data,
            message = userResponse.message or "Authentication failed by robot-service"
        }))
        return ngx.exit(ngx_HTTP_UNAUTHORIZED)
    end

    local user_id = userResponse.data and userResponse.data["id"]
    if not user_id then
        ngx_log(ngx_ERR, "robot-service response missing 'id' in 'data' field for " .. ctx_type .. " auth: " .. json.encode(userResponse))
        ngx.status = ngx_HTTP_INTERNAL_SERVER_ERROR
        ngx.say(json.encode({code = "5000", message = "Internal Server Error: Auth service response missing user_id"}))
        return ngx.exit(ngx_HTTP_INTERNAL_SERVER_ERROR)
    end

    ngx_log(ngx_WARN, "User authenticated successfully. user_id: " .. user_id .. " in " .. ctx_type .. " context. Setting headers.")
    ngx.req.set_header("user_id", user_id)
    ngx.req.set_header("user-info", json.encode({id = user_id}))

    return true -- 认证成功
end

-- 在 access_by_lua_file 执行时，脚本会直接运行。
-- 所以我们需要直接调用 authenticate_user 函数。
local _M = {
    authenticate_user = authenticate_user
}

_M.authenticate_user()

return _M
