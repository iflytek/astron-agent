package generator

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

func GenCurrTime(format string) string {
	if len(format) == 0 {
		return time.Now().Format("2006-01-02 15:04:05")
	}
	return time.Now().Format(format)
}

func GenTimeByAdd(time time.Time, d time.Duration) string {
	return time.Add(d).Format("2006-01-02 15:04:05")
}

func GenKey(appid string) string {
	bf := bytes.Buffer{}
	bf.WriteString(appid)
	bf.WriteString(time.Now().String())
	bf.WriteString(strconv.Itoa(rand.Int()))
	return fmt.Sprintf("%x", sha256.Sum256(bf.Bytes()))[:32]
}

func GenSecret() string {
	bf := bytes.Buffer{}
	for i := 0; i < 64; i++ {
		bf.WriteByte(byte(rand.Int()))
	}
	return base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%x", sha256.Sum256(bf.Bytes()))))[:32]
}

func GenAppId(num int) string {
	u := uuid.New()
	bf := bytes.Buffer{}
	bf.WriteString(strings.ReplaceAll(u.String(), "-", ""))
	bf.WriteString(strconv.Itoa(time.Now().Nanosecond()))
	return fmt.Sprintf("%x", sha256.Sum256(bf.Bytes()))[:num]
}
