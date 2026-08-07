package models

type App struct {
	AppId      string // generated app id
	AppName    string // app name
	DevId      int64  // developer id
	ChannelId  string // channel id
	Source     string // source
	IsDisable  bool   // is disabled(true disabled false enabled)
	Desc       string // app desc
	IsDelete   bool   // is deleted
	CreateTime string // create time
	UpdateTime string // update time
	Extend     string // extend field
}
