import time

import pika
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from shared.contracts.events import AnswerRecordedEvent
from shared.messaging import ACTIVITY_QUEUE, declare_activity_channel

from ..config import get_rabbit_settings
from ..services.activity import ActivityService


def run() -> None:
    settings = get_rabbit_settings()
    while True:
        connection = None
        try:
            connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
            channel = connection.channel()
            declare_activity_channel(channel)
            channel.basic_qos(prefetch_count=20)

            def on_message(ch, method, _properties, body):
                try:
                    event = AnswerRecordedEvent.model_validate_json(body)
                except ValidationError as exc:
                    print(f"Invalid event discarded: {exc}", flush=True)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                    return
                try:
                    ActivityService().record(event)
                except SQLAlchemyError:
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                    return
                ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_consume(queue=ACTIVITY_QUEUE, on_message_callback=on_message)
            channel.start_consuming()
        except (pika.exceptions.AMQPError, OSError) as exc:
            print(f"RabbitMQ unavailable: {exc}", flush=True)
            time.sleep(5)
        finally:
            if connection is not None and connection.is_open:
                connection.close()


if __name__ == "__main__":
    run()
