package models

type Auth struct {
	AppId      string // app id
	ApiKey     string // auth key
	ApiSecret  string // auth secret
	Source     int64  // source
	IsDelete   bool   // is deleted
	CreateTime string // create time
	UpdateTime string // update time
	Extend     string // extend field
}
