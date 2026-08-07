package generator

import (
	"fmt"
	"net"
	"os"
	"sync/atomic"
	"time"
)

const sid2 = 2

type SidGenerator2 struct {
	index        int64
	Location     string
	LocalIP      string
	ShortLocalIP string
	Port         string
}

func (s *SidGenerator2) NewSid(sub string) (string, error) {
	if len(sub) == 0 {
		sub = "src"
	}
	pid := os.Getpid() & 0xFF
	indexNow := atomic.AddInt64(&s.index, 1) & 0xffff
	tmInt := time.Now().UnixNano() / 1000000
	tm := fmt.Sprintf("%011x", tmInt)
	sid := fmt.Sprintf(
		"%3s%04x%04x@%2s%s%04s%02s%d",
		sub,
		pid,
		indexNow,
		s.Location,
		tm[len(tm)-11:],
		s.ShortLocalIP,
		s.Port[:2],
		sid2,
	)
	return sid, nil
}

func (s *SidGenerator2) Init(location, localIp, localPort string) {
	ip := net.ParseIP(localIp)
	var ipSec3, ipSec4 int
	if ip != nil {
		ipSec3 = (int)(ip[14])
		ipSec4 = (int)(ip[15])
		ip3 := ipSec3 & 0xFF
		ip4 := ipSec4 & 0xFF
		s.ShortLocalIP = fmt.Sprintf("%02x%02x", ip3, ip4)
	} else {
		panic("Bad IP !! " + s.LocalIP)
	}

	if len(localPort) < 4 {
		panic("Bad Port!! ")
	}

	s.Port = localPort
	s.Location = location
}
