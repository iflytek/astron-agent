from django.urls import path

from . import copywriting, definitions, memory

urlpatterns = [
    path("bot/ai-prologue-gen", copywriting.generate_prologue),
    path("agents", definitions.collection),
    path("agents/<int:agent_id>", definitions.item),
    path("agents/<int:agent_id>/favorite", definitions.favorite),
    path("agents/<int:agent_id>/versions", definitions.versions),
    path("agents/<int:agent_id>/published-version", definitions.published),
    path("agents/<int:agent_id>/memory/config", memory.config),
    path("agents/<int:agent_id>/memory/items", memory.items),
    path("agents/<int:agent_id>/memory/items/<str:memory_id>", memory.items),
]
