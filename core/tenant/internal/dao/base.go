package dao

import (
	"bytes"
	"fmt"
)

type SqlOption func() (string, []interface{})

func buildQuery(querySql string, options ...SqlOption) (string, []interface{}) {
	if len(options) == 0 {
		return querySql, nil
	}
	var buffer bytes.Buffer
	buffer.WriteString(querySql)
	params := make([]interface{}, 0, len(options))
	for index, option := range options {
		sqlStr, param := option()
		params = append(params, param...)
		if index == 0 {
			buffer.WriteString(" where ")
			buffer.WriteString(sqlStr)
			continue
		}
		buffer.WriteString(" and ")
		buffer.WriteString(sqlStr)
	}
	return buffer.String(), params
}

func buildUpdate(updateSql string, options ...SqlOption) (string, []interface{}, error) {
	if len(options) == 0 {
		return "", nil, fmt.Errorf("update content is empty")
	}
	var buffer bytes.Buffer
	params := make([]interface{}, 0, len(options))
	for index, option := range options {
		s, param := option()
		buffer.WriteString(s)
		params = append(params, param...)
		if index == len(options)-1 {
			continue
		}
		buffer.WriteString(",\n")
	}
	return fmt.Sprintf(updateSql, buffer.String()), params, nil
}

func buildUpdateWithQuery(updateSql string, whereSql []SqlOption, setSql ...SqlOption) (string, []interface{}, error) {
	finalSql, setParams, err := buildUpdate(updateSql, setSql...)
	if err != nil {
		return "", nil, err
	}
	finalSql, whereParam := buildQuery(finalSql, whereSql...)
	params := make([]interface{}, 0, len(setParams)+len(whereParam))
	params = append(params, setParams...)
	params = append(params, whereParam...)
	return finalSql, params, nil
}
