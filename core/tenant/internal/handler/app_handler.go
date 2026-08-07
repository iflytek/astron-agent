package handler

import (
	"errors"
	"log"
	"net/http"

	"tenant/internal/models"
	"tenant/internal/service"
	"tenant/tools/generator"

	"github.com/gin-gonic/gin"
)

type AppHandler struct {
	appService *service.AppService
}

func NewAppHandler(appService *service.AppService) (*AppHandler, error) {
	if appService == nil {
		return nil, errors.New("appService is nil")
	}
	return &AppHandler{
		appService: appService,
	}, nil
}

func (handler *AppHandler) SaveApp(c *gin.Context) {
	sid := c.GetString(keySid)
	source := c.GetString(keySource)
	req, err := newAddAppReq(c)
	if err != nil {
		log.Printf("build add app request error: %v", err)
		resp := newErrResp(ParamErr, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	result, err := handler.appService.SaveApp(&models.App{
		AppId:      generator.GenAppId(8),
		AppName:    req.AppName,
		DevId:      req.DevId,
		ChannelId:  req.CloudId,
		IsDisable:  false,
		Source:     source,
		Desc:       req.AppDesc,
		IsDelete:   false,
		CreateTime: generator.GenCurrTime(""),
		UpdateTime: generator.GenCurrTime(""),
		Extend:     "",
	}, nil)
	if err != nil {
		var appErr service.BizErr
		if errors.As(err, &appErr) {
			log.Printf("requestId: %s, AppAdd error: %s", req.RequestId, appErr.Msg())
			resp := newErrResp(appErr.Code(), appErr.Msg(), sid)
			c.JSON(http.StatusOK, resp)
			return
		}
		log.Printf("request[%v] add app error: %v", req.RequestId, err.Error())
		resp := newErrResp(service.ErrCodeSystem, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	resp := newSuccessResp(result, sid)
	c.JSON(http.StatusOK, resp)
}

func (handler *AppHandler) ModifyApp(c *gin.Context) {
	sid := c.GetString(keySid)
	source := c.GetString(keySource)
	req, err := newModifyAppReq(c)
	if err != nil {
		log.Printf("build modify app request error: %v", err)
		resp := newErrResp(ParamErr, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	err = handler.appService.ModifyApp(&models.App{
		AppId:     req.AppId,
		AppName:   req.AppName,
		ChannelId: req.CloudId,
		Desc:      req.AppDesc,
		Source:    source,
	})
	if err != nil {
		var appErr service.BizErr
		if errors.As(err, &appErr) {
			log.Printf("request[%v] add app error: %v", req.RequestId, appErr.Msg())
			resp := newErrResp(appErr.Code(), appErr.Msg(), sid)
			c.JSON(http.StatusOK, resp)
			return
		}

		log.Printf("request[%v] add app error: %v", req.RequestId, err.Error())
		resp := newErrResp(service.ErrCodeSystem, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	resp := newSuccessResp(nil, sid)
	c.JSON(http.StatusOK, resp)
}

func (handler *AppHandler) DeleteApp(c *gin.Context) {
	sid := c.GetString(keySid)
	req, err := newDeleteAppReq(c)
	if err != nil {
		log.Printf("build delete appid request error: %v", err)
		resp := newErrResp(ParamErr, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	err = handler.appService.Delete(req.AppId)
	if err != nil {
		var appErr service.BizErr
		if errors.As(err, &appErr) {
			log.Printf("request[%v] delete app error: %v", req.RequestId, appErr.Msg())
			resp := newErrResp(appErr.Code(), appErr.Msg(), sid)
			c.JSON(http.StatusOK, resp)
			return
		}

		log.Printf("request[%v] delete app error: %v", req.RequestId, err.Error())
		resp := newErrResp(service.ErrCodeSystem, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	resp := newSuccessResp(nil, sid)
	c.JSON(http.StatusOK, resp)
}

func (handler *AppHandler) DisableApp(c *gin.Context) {
	sid := c.GetString(keySid)
	req, err := newDisableAppReq(c)
	if err != nil {
		log.Printf("build disable appid request error: %v", err)
		resp := newErrResp(ParamErr, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	err = handler.appService.DisableOrEnable(req.AppId, req.Disable)
	if err != nil {
		var appErr service.BizErr
		if errors.As(err, &appErr) {
			log.Printf("request[%v] disable app error: %v", req.RequestId, appErr.Msg())
			resp := newErrResp(appErr.Code(), appErr.Msg(), sid)
			c.JSON(http.StatusOK, resp)
			return
		}

		log.Printf("request[%v] disable app error: %v", req.RequestId, err.Error())
		resp := newErrResp(service.ErrCodeSystem, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	resp := newSuccessResp(nil, sid)
	c.JSON(http.StatusOK, resp)
}

func (handler *AppHandler) ListApp(c *gin.Context) {
	sid := c.GetString(keySid)
	req, err := newAppListReq(c)
	if err != nil {
		log.Printf("build app list request error: %v", err)
		resp := newErrResp(ParamErr, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	apps, err := handler.appService.Query(&service.AppQuery{
		AppIds:  req.AppIds,
		Name:    req.Name,
		DevId:   req.DevId,
		CloudId: req.CloudId,
	})
	if err != nil {
		var appErr service.BizErr
		if errors.As(err, &appErr) {
			resp := newErrResp(appErr.Code(), appErr.Msg(), sid)
			c.JSON(http.StatusOK, resp)
			return
		}
		resp := newErrResp(service.ErrCodeSystem, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	if len(apps) == 0 {
		resp := newSuccessResp(nil, sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	data := make([]*AppData, 0, len(apps))
	for _, app := range apps {
		data = append(data, &AppData{
			Appid:      app.AppId,
			Name:       app.AppName,
			CloudId:    app.ChannelId,
			DevId:      app.DevId,
			IsDisable:  app.IsDisable,
			Desc:       app.Desc,
			Source:     app.Source,
			CreateTime: app.CreateTime,
		})
	}
	resp := newSuccessResp(data, sid)
	c.JSON(http.StatusOK, resp)
}

func (handler *AppHandler) DetailApp(c *gin.Context) {
	sid := c.GetString(keySid)
	req, err := newAppListReq(c)
	if err != nil {
		log.Printf("build app list request error: %v", err)
		resp := newErrResp(ParamErr, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	details, err := handler.appService.QueryDetails(&service.AppQuery{
		AppIds:  req.AppIds,
		Name:    req.Name,
		DevId:   req.DevId,
		CloudId: req.CloudId,
	})
	if err != nil {
		var appErr service.BizErr
		if errors.As(err, &appErr) {
			resp := newErrResp(appErr.Code(), appErr.Msg(), sid)
			c.JSON(http.StatusOK, resp)
			return
		}

		resp := newErrResp(service.ErrCodeSystem, err.Error(), sid)
		c.JSON(http.StatusOK, resp)
		return
	}
	resp := newSuccessResp(details, sid)
	c.JSON(http.StatusOK, resp)
}
