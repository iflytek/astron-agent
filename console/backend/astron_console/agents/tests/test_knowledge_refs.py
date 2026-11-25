"""Legacy knowledge identifiers must not broaden authorization or retrieval scope."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TestCase

from astron_console.agents.definitions import definition, save_definition
from astron_console.agents.models import Agent, AgentDataset, AgentDatasetMaas, AgentState
from astron_console.agents.resource_resolution import resolve_resources, snapshot_references
from astron_console.knowledge.models import Document, Repo
from astron_console.resources.models import Model
from astron_console.spaces.permissions import ResourceScope


class KnowledgeReferenceTests(TestCase):
    def setUp(self):
        self.scope = ResourceScope("retained-user", None, None)
        self.model = Model.objects.create(
            uid=self.scope.uid,
            name="model",
            provider="openai",
            enable=True,
            api_key="retained",
            url="http://model.example/v1",
            domain="model",
        )
        self.agent = Agent.objects.create(
            uid=self.scope.uid,
            bot_name="old",
            model_id=self.model.pk,
        )
        self.repo = Repo.objects.create(
            id=72,
            name="correct",
            user_id=self.scope.uid,
            core_repo_id="original-core",
            tag="Ragflow-RAG",
            ragflow_dataset_id="original-ragflow",
        )
        self.decoy = Repo.objects.create(id=91, name="same dataset id", user_id=self.scope.uid)
        Document.objects.create(repo_id=self.repo.pk, uuid="enabled-remote", enabled=1)
        Document.objects.create(repo_id=self.repo.pk, uuid="disabled-remote", enabled=0)
        Document.objects.create(repo_id=self.decoy.pk, uuid="foreign-repo", enabled=1)

    def associate(self, **extra):
        return AgentDatasetMaas.objects.create(
            bot_id=self.agent.pk,
            uid=self.scope.uid,
            dataset_id=self.decoy.pk,
            dataset_index=str(self.repo.pk),
            is_act=1,
            **extra,
        )

    def test_maas_uses_dataset_index_and_only_enabled_documents_of_authorized_repo(self):
        self.associate()
        AgentDatasetMaas.objects.create(
            bot_id=self.agent.pk,
            dataset_id=1,
            dataset_index="999",
            is_act=0,
        )
        result = definition(self.agent)
        self.assertEqual(result["repoIds"], [self.repo.pk])
        knowledge = resolve_resources(self.scope, result)["plugin"]["knowledge"]
        self.assertEqual(len(knowledge), 1)
        self.assertEqual(
            knowledge[0]["match"],
            {
                "repo_ids": ["original-core"],
                "doc_ids": ["enabled-remote"],
                "dataset_ids": ["original-ragflow"],
            },
        )
        self.assertEqual(snapshot_references(self.scope, result)["repoIds"], [self.repo.pk])

    def test_foreign_and_space_repos_are_rejected_even_with_retained_association(self):
        self.associate()
        for owner, space in [("other-user", None), (self.scope.uid, 8)]:
            self.repo.user_id, self.repo.space_id = owner, space
            self.repo.save()
            with self.assertRaises(PermissionDenied):
                resolve_resources(self.scope, definition(self.agent))

    def test_empty_enabled_document_filter_fails_instead_of_retrieving_entire_dataset(self):
        self.associate()
        Document.objects.filter(repo_id=self.repo.pk).update(enabled=0)
        with self.assertRaisesMessage(ValidationError, "已启用文档"):
            resolve_resources(self.scope, definition(self.agent))

    def test_personal_dataset_never_becomes_same_number_repo_and_explicit_selection_supersedes(
        self,
    ):
        original = AgentDataset.objects.create(
            bot_id=self.agent.pk,
            uid=self.scope.uid,
            dataset_id=self.decoy.pk,
            dataset_index=f"{self.scope.uid}_{self.decoy.pk}",
            is_act=1,
        )
        result = definition(self.agent)
        self.assertEqual(result["repoIds"], [])
        self.assertEqual(result["legacyDatasetIds"], [self.decoy.pk])
        for action in [resolve_resources, snapshot_references]:
            with self.assertRaisesMessage(ValidationError, "尚未接入统一执行"):
                action(self.scope, result)
        save_definition(self.agent, self.scope, {"botName": "renamed"})
        self.assertEqual(definition(self.agent)["legacyDatasetIds"], [self.decoy.pk])
        save_definition(self.agent, self.scope, {"repoIds": [self.repo.pk]})
        current = definition(self.agent)
        self.assertEqual(current["legacyDatasetIds"], [])
        self.assertEqual(AgentState.objects.get(agent_id=self.agent.pk).config["repoIds"], [72])
        self.assertEqual(
            resolve_resources(self.scope, current)["plugin"]["knowledge"][0]["name"], "correct"
        )
        original.refresh_from_db()
        self.assertEqual((original.dataset_id, original.is_act), (91, 1))
        save_definition(self.agent, self.scope, {"repoIds": []})
        self.assertEqual(definition(self.agent)["repoIds"], [])
        self.assertEqual(definition(self.agent)["legacyDatasetIds"], [])

    def test_invalid_maas_index_is_not_replaced_with_dataset_id(self):
        row = self.associate()
        row.dataset_index = None
        row.save()
        self.assertEqual(definition(self.agent)["repoIds"], [f"legacy-maas:{row.pk}"])
        with self.assertRaises(PermissionDenied):
            resolve_resources(self.scope, definition(self.agent))
        save_definition(self.agent, self.scope, {"repoIds": [self.repo.pk]})
        self.assertEqual(definition(self.agent)["repoIds"], [self.repo.pk])
        row.refresh_from_db()
        self.assertIsNone(row.dataset_index)
