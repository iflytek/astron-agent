from django.urls import path

from . import media, wechat

urlpatterns = [
    path("voice/tts-sign", media.tts),
    path("voice/get-pronunciation-person", media.pronunciation),
    path("rtasr/rtasr-sign", media.rtasr),
    path("speaker/train/get-text", media.training_text),
    path("speaker/train/create", media.train),
    path("speaker/train/tasks/<str:task_id>", media.training_status),
    path("speaker/train/train-speaker", media.speakers),
    path("speaker/train/update-speaker", media.speaker),
    path("speaker/train/delete-speaker", media.delete_speaker),
    path("talkAgent/getSceneList", media.scenes),
    path("talkAgent/getVCNList", media.vcn_list),
    path("talkAgent/create", media.talk_create),
    path("talkAgent/upgradeWorkflow", media.talk_create, {"upgrade": True}),
    path("talkAgent/updateConfig", media.talk_update),
    path("talkAgent/signature", media.talk_signature),
    path("talkAgent/saveHistory", media.save_history),
    path("api/wx/auth-url", wechat.auth_url),
    path("api/wx/callback", wechat.callback),
    path("api/wx/callback/<str:appid>", wechat.callback),
    path("api/wx/authCallback", wechat.auth_callback),
    path("api/wx/binding", wechat.binding),
]
