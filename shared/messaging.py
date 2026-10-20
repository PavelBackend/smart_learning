from pika.adapters.blocking_connection import BlockingChannel

EXCHANGE = "learning.events"
ACTIVITY_QUEUE = "learning.activity"
ANSWER_ROUTING_KEY = "practice.answer_recorded"


def declare_activity_channel(channel: BlockingChannel) -> None:
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=ACTIVITY_QUEUE, durable=True)
    channel.queue_bind(queue=ACTIVITY_QUEUE, exchange=EXCHANGE, routing_key=ANSWER_ROUTING_KEY)
