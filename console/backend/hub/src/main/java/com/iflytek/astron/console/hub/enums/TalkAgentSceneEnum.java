package com.iflytek.astron.console.hub.enums;

import com.iflytek.astron.console.commons.dto.bot.TalkAgentSceneDto;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Talk Agent Scene Enum
 */
@Getter
@AllArgsConstructor
public enum TalkAgentSceneEnum {

    XIAOYUN("110022010", "x4_xiaoyuan", "晓云", "女", "大半身",
            Arrays.asList("教育学习"),
            "https://openstorage.xfyousheng.com/asset/asset/20221230/d8fe865d-50e0-4861-9a8d-7eed6962f62b.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/ee441da4-71cc-435f-971b-842e560b56ca/1760939979089/%E6%99%93%E4%BA%911.png"),

    YIFAN_FULL("110026013", "x4_mingge", "伊凡", "男", "全身",
            Arrays.asList("AI主播"),
            "https://openstorage.xfyousheng.com/asset/asset/20250411/40099e54-455b-42f1-a628-9656fcb855bf.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/3de6e7e8-1fca-4335-ae8f-215b9ee47c9c/1760939980311/%E4%BC%8A%E5%87%A12.png"),

    YIFAN_HALF("110026011", "x4_mingge", "伊凡", "男", "大半身",
            Arrays.asList("AI主播"),
            "https://openstorage.xfyousheng.com/asset/asset/20221230/94298be2-9217-472e-8121-e07cf463c50b.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/b39ead2d-5c0d-4fec-a504-a4e0347f83b7/1760939980791/%E4%BC%8A%E5%87%A13.png"),

    XIAOXIAN("110021004", "x4_lingxiaoyu_assist", "晓娴", "女", "全身",
            Arrays.asList("AI主播"),
            "https://openstorage.xfyousheng.com/asset/asset/20230202/d26f035b-6341-4b43-b538-15bbbc0580ae.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/6e69b2f1-ea6a-472d-8da2-63c86944d861/1760939978179/%E6%99%93%E5%A8%B4.png"),

    LINNA("110335005", "x4_EnUs_Lindsay_assist", "Linna", "女", "全身",
            Arrays.asList("教育学习"),
            "https://openstorage.xfyousheng.com/asset/asset/20230911/661b7f10-6b55-4be2-83d2-bad91c660e33.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/6cc5261a-837f-404d-ac57-f50d08c51578/1760939982606/Linna.png"),

    SUSHI("111051001", "x4_chaoge", "苏轼", "男", "全身",
            Arrays.asList("历史人物"),
            "https://openstorage.xfyousheng.com/asset/asset/20250430/b3d15fc7-6073-4b10-9e5f-95d2ef9107cc.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/cf725fa3-c7fc-4da6-b7c3-36a4d1961cf5/1760939986479/%E8%8B%8F%E8%BD%BC.png"),

    MUMU("110332017", "f18f328_ttsclone-xfyousheng-ddivi", "沐沐", "女", "全身",
            Arrays.asList("AI主播"),
            "https://openstorage.xfyousheng.com/asset/asset/20240417/5e7d9668-c5b2-4d8e-8a8c-ba8fc7d7dfc3.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/66a74323-5333-46da-b6fa-742aeb203f90/1760939985947/%E6%B2%90%E6%B2%90.png"),

    DUODUO("111034002", "x4_lingyouyou_oral", "朵朵", "女", "全身",
            Arrays.asList("卡通形象"),
            "https://openstorage.xfyousheng.com/asset/asset/20250617/5a6ab0b2-2eb5-447a-af17-9354c241ff52.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/db15597f-6d2a-4db5-8ea7-c89ed508b2bf/1760939983458/%E6%9C%B5%E6%9C%B5.png"),

    YISHENG("111181001", "8575648_ttsclone-xfyousheng-kssxv", "易声", "男", "全身",
            Arrays.asList("卡通形象"),
            "https://openstorage.xfyousheng.com/asset/asset/20250828/47ca80fe-b7c2-42ee-8dfc-85cf086a4347.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/f79c63f8-1da4-42fa-a0fe-0c2f7d55634b/1760939981210/%E6%98%93%E5%A3%B0.png"),

    ZHAOZHAO("111165001", "5f2e7b1_ttsclone-xfyousheng-ydynu", "昭昭", "女", "大半身",
            Arrays.asList("数字员工"),
            "https://openstorage.xfyousheng.com/asset/asset/20250814/12eee581-52d3-4fa6-bea8-1731ca303bf6.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/0be87a7e-1510-43bf-bbfa-b774fca8d967/1760939982191/%E6%98%AD%E6%98%AD.png"),

    XIAOWEN("110264001", "x4_xiaoguo", "晓雯", "女", "大半身",
            Arrays.asList("AI主播", "数字员工"),
            "https://openstorage.xfyousheng.com/asset/asset/20230629/b968d57e-762d-4643-854b-ea74e70aec6d.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/49c604ff-939c-4c22-82b5-58cd4ae3f175/1760939977736/%E6%99%93%E9%9B%AF.png"),

    XIAOYI("110005011", "x4_lingxiaoqi_assist", "晓依", "女", "全身",
            Arrays.asList("数字员工"),
            "https://openstorage.xfyousheng.com/asset/asset/20220921/09cc5000-2f1c-4779-8102-37cef51d52e5.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/dcf6ae14-7b5f-4e09-8bc0-ec57b80df052/1760939978610/%E6%99%93%E4%BE%9D.png"),

    CHENCHEN("110276004", "x4_lingyouyou_oral", "辰辰", "女", "全身",
            Arrays.asList("卡通形象"),
            "https://openstorage.xfyousheng.com/asset/asset/20250115/80442720-1421-49de-b944-80dc52200fab.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/ac98aaa9-1a23-4fd2-b560-b9fb93f01103/1760939983002/%E8%BE%B0%E8%BE%B0.png"),

    MINGXUAN("110592025", "x4_chaoge", "明轩", "男", "全身",
            Arrays.asList("AI主播", "数字员工"),
            "https://openstorage.xfyousheng.com/asset/asset/20240226/027c3a95-f3d5-48c1-b24e-d251a0ca2e5e.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/a7d751b5-574b-475c-9b42-99b13fb35ee8/1760939985534/%E6%98%8E%E8%BD%A9.png"),

    MAKE("110017006", "x4_chaoge", "马可", "男", "全身",
            Arrays.asList("数字员工"),
            "https://openstorage.xfyousheng.com/asset/asset/20230804/ba054391-8b24-4de5-a1a7-ecd14c0b335a.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/669ff71c-a0a9-424b-a234-a0df8de7ad64/1760939985137/%E9%A9%AC%E5%8F%AF.png"),

    WANLENG("110934003", "a050e71_ttsclone-xfyousheng-lbhge", "婉冷", "女", "全身",
            Arrays.asList("卡通形象"),
            "https://openstorage.xfyousheng.com/asset/asset/20250416/5f699c4f-a0fb-4ad9-8ae8-2d306963a7c8.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/45412fc4-c4be-4eb0-9fa3-0f7d1cbbd1de/1760939986892/%E5%A9%89%E5%86%B7.png"),

    XIAOMAN("118805001", "x4_lingxiaoyao_anime", "小满", "女", "全身",
            Arrays.asList("卡通形象"),
            "https://openstorage.xfyousheng.com/asset/asset/20250610/b3a7d739-97cb-48aa-bc25-d88b112e8c56.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/fb85c703-87e3-4c9a-a985-8de3e5c794d8/1760939976313/%E5%B0%8F%E6%BB%A1.png"),

    LIQINGZHAO("111064001", "a050e71_ttsclone-xfyousheng-lbhge", "李清照", "女", "全身",
            Arrays.asList("历史人物"),
            "https://openstorage.xfyousheng.com/asset/asset/20250514/a414ecb6-d421-4526-9607-0aec75cd182d.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/bb07ca0b-0266-4a67-8e4e-72a0b383cb04/1760939984345/%E6%9D%8E%E6%B8%85%E7%85%A7.png"),

    LINDAIYU("111068001", "5f2e7b1_ttsclone-xfyousheng-ydynu", "林黛玉", "女", "全身",
            Arrays.asList("历史人物"),
            "https://openstorage.xfyousheng.com/asset/asset/20250520/8ab61943-9d11-45a1-8ee6-525ec69c9a85.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/d0ecdd75-9ae6-4669-8e81-911eda933bc9/1760939984729/%E6%9E%97%E9%BB%9B%E7%8E%89.png"),

    FENGYAN("111141001", "8575648_ttsclone-xfyousheng-kssxv", "风晏", "男", "全身",
            Arrays.asList("卡通形象"),
            "https://openstorage.xfyousheng.com/asset/asset/20250710/7486ef33-5a11-41ad-982a-23287ad40f1a.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/949c05d2-97bf-4595-900d-cdaea444d19f/1760939983954/%E9%A3%8E%E6%99%8F.png"),

    WANYI("110934001", "5f2e7b1_ttsclone-xfyousheng-ydynu", "婉仪", "女", "大半身",
            Arrays.asList("AI主播", "数字员工"),
            "https://minio.xfyousheng.com/train/train/20241227/image/441aaee8-222f-4dda-ade4-cbbec45240f7.png",
            "https://openres.xfyun.cn/xfyundoc/2025-10-20/1027fd60-ed7a-4e10-aa47-5fa0198db7c7/1760939987286/%E5%A9%89%E4%BB%AA.png");

    private final String sceneId;
    private final String defaultVCN;
    private final String name;
    private final String gender;
    private final String posture;
    private final List<String> type;
    private final String avatar;
    private final String sampleAvatar;


    public static List<TalkAgentSceneDto> getAllScenes() {
        return Arrays.stream(values())
                .map(scene -> new TalkAgentSceneDto(
                        scene.getSceneId(),
                        scene.getDefaultVCN(),
                        scene.getName(),
                        scene.getGender(),
                        scene.getPosture(),
                        scene.getType(),
                        scene.getAvatar(),
                        scene.getSampleAvatar()))
                .collect(Collectors.toList());
    }

}
