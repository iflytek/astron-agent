package handler

import (
	"bytes"
	"strconv"
)

const (
	Success  int = 0
	ParamErr int = 14001
	SidErr   int = 14002
)

type HandlerErr struct {
	code       int
	msg        string
	fullErrMsg string
}

func NewHandlerErr(code int, msg string) HandlerErr {
	return HandlerErr{
		code: code,
		msg:  msg,
	}
}

func (err HandlerErr) Code() int {
	return err.code
}

func (err HandlerErr) Msg() string {
	return err.msg
}

func (err HandlerErr) Error() string {
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
