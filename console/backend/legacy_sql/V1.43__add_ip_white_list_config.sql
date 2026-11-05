INSERT INTO config_info (
    category, code, name, `value`, is_valid, remarks, create_time, update_time
)
SELECT
    'IP_WHITE_LIST',
    'ip_white_list',
    'IP白名单',
    '',
    1,
    '允许URL主机直接填写的精确IP或CIDR，多个值使用英文逗号分隔',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM config_info
    WHERE category = 'IP_WHITE_LIST' AND code = 'ip_white_list'
);

INSERT INTO config_info_en (
    category, code, name, `value`, is_valid, remarks, create_time, update_time
)
SELECT
    'IP_WHITE_LIST',
    'ip_white_list',
    'IP whitelist',
    '',
    1,
    'Allowed exact IPs or CIDR ranges for IP-literal URL hosts, separated by commas',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM config_info_en
    WHERE category = 'IP_WHITE_LIST' AND code = 'ip_white_list'
);
