package handler

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type AppListReq struct {
	Name    string
	AppIds  []string
	DevId   int
	CloudId string
}

func newAppListReq(c *gin.Context) (*AppListReq, error) {
	name, _ := c.GetQuery("name")
	appIds, _ := c.GetQuery("app_ids")
	cloudId, _ := c.GetQuery("cloud_id")
	devId, _ := c.GetQuery("dev_id")
	if len(name) == 0 && len(appIds) == 0 {
		return nil, errors.New("name or app_ids param must have at least one")
	}

	req := &AppListReq{
		Name:    name,
		CloudId: cloudId,
	}

	if len(appIds) > 0 {
		req.AppIds = strings.Split(appIds, ",")
	}

	if len(devId) > 0 {
		devIdInt, err := strconv.Atoi(devId)
		if err != nil {
			return nil, err
		}
		req.DevId = devIdInt
	}

	return req, nil
}

type AddAppByAppIdReq struct {
	RequestId string `json:"request_id"`
	AppId     string `json:"app_id"`
	AppKey    string `json:"app_key"`
	AppSecret string `json:"app_secret"`
	AppName   string `json:"app_name"`
	AppDesc   string `json:"app_desc"`
	DevId     int64  `json:"dev_id"`
	CloudId   string `json:"cloud_id"`
}

type AddAppReq struct {
	RequestId string `json:"request_id"`
	AppName   string `json:"app_name"`
	AppDesc   string `json:"app_desc"`
	DevId     int64  `json:"dev_id"`
	CloudId   string `json:"cloud_id"`
}

func newAddAppReq(c *gin.Context) (*AddAppReq, error) {
	req := &AddAppReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.RequestId) == 0 {
		return nil, errors.New("request_id must not been empty")
	}
	if len(req.AppName) == 0 {
		return nil, errors.New("app_name must not been empty")
	}
	if req.DevId <= 0 {
		return nil, errors.New("dev_id must been more than zero")
	}
	if len(req.CloudId) == 0 {
		return nil, errors.New("cloud_id must not been empty")
	}
	if len(req.AppDesc) == 0 {
		req.AppDesc = ""
	}
	return req, nil
}

type ModifyAppReq struct {
	RequestId string `json:"request_id"`
	AppId     string `json:"app_id"`
	AppName   string `json:"app_name"`
	CloudId   string `json:"cloud_id"`
	AppDesc   string `json:"app_desc"`
}

func newModifyAppReq(c *gin.Context) (*ModifyAppReq, error) {
	req := &ModifyAppReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.RequestId) == 0 {
		return nil, errors.New("request_id must not been empty")
	}
	if len(req.AppId) == 0 {
		return nil, errors.New("app_id must not been empty")
	}
	return req, nil
}

type DisableAppReq struct {
	RequestId string `json:"request_id"`
	AppId     string `json:"app_id"`
	Disable   bool   `json:"disable"`
}

func newDisableAppReq(c *gin.Context) (*DisableAppReq, error) {
	req := &DisableAppReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.RequestId) == 0 {
		return nil, errors.New("request_id must not been empty")
	}
	if len(req.AppId) == 0 {
		return nil, errors.New("app_id must not been empty")
	}
	return req, nil
}

type DeleteAppReq struct {
	RequestId string `json:"request_id"`
	AppId     string `json:"app_id"`
}

func newDeleteAppReq(c *gin.Context) (*DeleteAppReq, error) {
	req := &DeleteAppReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.RequestId) == 0 {
		return nil, errors.New("request_id must not been empty")
	}
	if len(req.AppId) == 0 {
		return nil, errors.New("app_id must not been empty")
	}
	return req, nil
}

type AddAuthReq struct {
	RequestId string `json:"request_id"`
	AppId     string `json:"app_id"`
	ApiKey    string `json:"api_key"`
	ApiSecret string `json:"api_secret"`
}

func newAddAuthReq(c *gin.Context) (*AddAuthReq, error) {
	req := &AddAuthReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.RequestId) == 0 {
		return nil, errors.New("request_id must not been empty")
	}
	if len(req.AppId) == 0 {
		return nil, errors.New("app_id must not been empty")
	}
	return req, nil
}

type DeleteAuthReq struct {
	RequestId string `json:"request_id"`
	AppId     string `json:"app_id"`
	ApiKey    string `json:"api_key"`
}

func newDeleteAuthReq(c *gin.Context) (*DeleteAuthReq, error) {
	req := &DeleteAuthReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.RequestId) == 0 {
		return nil, errors.New("request_id must not been empty")
	}
	if len(req.AppId) == 0 {
		return nil, errors.New("app_id must not been empty")
	}
	if len(req.ApiKey) == 0 {
		return nil, errors.New("api_key must not been empty")
	}
	return req, nil
}

type VerifyAppAuthReq struct {
	ApiKey    string `json:"api_key"`
	ApiSecret string `json:"api_secret"`
}

func newVerifyAppAuthReq(c *gin.Context) (*VerifyAppAuthReq, error) {
	req := &VerifyAppAuthReq{}
	err := c.BindJSON(req)
	if err != nil {
		return nil, err
	}
	if len(req.ApiKey) == 0 {
		return nil, errors.New("api_key must not been empty")
	}
	if len(req.ApiSecret) == 0 {
		return nil, errors.New("api_secret must not been empty")
	}
	return req, nil
}
