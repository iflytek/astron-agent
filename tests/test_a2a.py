import pytest
from a2a.protocol import A2AMessage, A2AMessageType, A2AError
from a2a.handler import A2AHandler


class TestA2AMessage:
    def test_serialization_roundtrip(self):
        msg = A2AMessage(
            type=A2AMessageType.TASK_STATE,
            source="agent1",
            target="agent2",
            data={"task_id": "123", "status": "completed"},
            metadata={"priority": 1}
        )
        json_str = msg.to_json()
        restored = A2AMessage.from_json(json_str)
        assert restored == msg

    def test_from_json_invalid_type(self):
        with pytest.raises(ValueError):
            A2AMessage.from_json('{"type": "invalid", "source": "a", "target": "b"}')


class TestA2AHandler:
    @pytest.mark.asyncio
    async def test_handle_message_with_handler(self):
        handler = A2AHandler(agent_id="agent1", agent_name="TestAgent")

        async def echo_handler(msg):
            return A2AMessage(
                type=A2AMessageType.TASK_STATE,
                source="agent1",
                target=msg.source,
                data={"echo": msg.data}
            )

        handler.register_handler(A2AMessageType.TASK_STATE, echo_handler)

        msg = A2AMessage(
            type=A2AMessageType.TASK_STATE,
            source="agent2",
            target="agent1",
            data={"hello": "world"}
        )
        response = await handler.handle_message(msg)
        assert response is not None
        assert response.type == A2AMessageType.TASK_STATE
        assert response.data["echo"] == {"hello": "world"}

    @pytest.mark.asyncio
    async def test_handle_message_no_handler(self):
        handler = A2AHandler(agent_id="agent1", agent_name="TestAgent")
        msg = A2AMessage(
            type=A2AMessageType.TASK_CANCEL,
            source="agent2",
            target="agent1",
            data={}
        )
        response = await handler.handle_message(msg)
        assert response is not None
        assert response.type == A2AMessageType.ERROR
        assert response.data["code"] == 404

    @pytest.mark.asyncio
    async def test_handle_message_wrong_target(self):
        handler = A2AHandler(agent_id="agent1", agent_name="TestAgent")
        msg = A2AMessage(
            type=A2AMessageType.TASK_STATE,
            source="agent2",
            target="agent3",
            data={}
        )
        response = await handler.handle_message(msg)
        assert response is None

    def test_set_and_get_card(self):
        handler = A2AHandler(agent_id="agent1", agent_name="TestAgent")
        card = {"name": "TestAgent", "skills": ["nlp"]}
        handler.set_agent_card(card)
        assert handler.get_agent_card() == card

    def test_get_card_not_set(self):
        handler = A2AHandler(agent_id="agent1", agent_name="TestAgent")
        with pytest.raises(A2AError):
            handler.get_agent_card()
