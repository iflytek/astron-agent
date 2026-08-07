package handler

type Resp struct {
	Sid     string      `json:"sid"`
	Code    int         `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func newErrResp(code int, message string, sid string) *Resp {
	return &Resp{
		Sid:     sid,
		Code:    code,
		Message: message,
	}
}

func newSuccessResp(data interface{}, sid string) *Resp {
	return &Resp{
		Sid:     sid,
		Code:    Success,
		Message: "success",
		Data:    data,
	}
}

type AppData struct {
	Appid      string `json:"appid"`
	Name       string `json:"name"`
	DevId      int64  `json:"dev_id"`
	CloudId    string `json:"cloud_id"`
	Source     string `json:"source"`
	IsDisable  bool   `json:"is_disable"`
	Desc       string `json:"desc"`
	CreateTime string `json:"create_time"`
}

type AuthData struct {
	ApiKey    string `json:"api_key"`    // Authentication key
	ApiSecret string `json:"api_secret"` // Authentication secret
}

type AllowListData struct {
	IP     string `json:"ip"`
	Enable bool   `json:"enable"`
}
