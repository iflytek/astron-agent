package service

import (
	"bytes"
	"strconv"
)

type AppQuery struct {
	AppIds  []string
	Name    string
	DevId   int
	CloudId string
}

type AddAppResult struct {
	AppId     string `json:"app_id"`     // generated app id
	ApiKey    string `json:"api_key"`    //
	ApiSecret string `json:"api_secret"` //
}

type AddAuthResult struct {
	ApiKey    string `json:"api_key"`
	ApiSecret string `json:"api_secret"`
}

type AppDetailsData struct {
	Appid     string      `json:"appid"`
	Name      string      `json:"name"`
	IsDisable bool        `json:"is_disable"`
	AuthList  []*AuthData `json:"auth_list,omitempty"`
	Desc      string      `json:"desc"`
}

type AuthData struct {
	ApiKey    string `json:"api_key"`
	ApiSecret string `json:"api_secret"`
}

const (
	ErrCodeBYD      int = 3001
	ErrCodeSystem   int = 3002
	AppIdNotExist   int = 3003
	ApiKeyHasExist  int = 3004
	ApiKeyNotExist  int = 3006
	APPNameHasExist int = 3007
)

type BizErr struct {
	code       int
	msg        string
	fullErrMsg string
}

func NewBizErr(code int, msg string) BizErr {
	return BizErr{
		code: code,
		msg:  msg,
	}
}

func (err BizErr) Code() int {
	return err.code
}

func (err BizErr) Msg() string {
	return err.msg
}

func (err BizErr) Error() string {
	if len(err.fullErrMsg) > 0 {
		return err.fullErrMsg
	}
	var buffer bytes.Buffer
	buffer.WriteString("code:")
	buffer.WriteString(strconv.Itoa(err.code))
	buffer.WriteString("msg:")
	buffer.WriteString(err.msg)
	err.fullErrMsg = buffer.String()
	return err.fullErrMsg
}
