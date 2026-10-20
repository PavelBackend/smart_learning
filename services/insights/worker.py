import json
import os
import time
from datetime import datetime
from uuid import UUID

import pika
from sqlalchemy.exc import IntegrityError

from main import Activity, Base, Session, TIMEZONE, engine


def run():
    Base.metadata.create_all(engine)
    while True:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
            channel = connection.channel()
            channel.exchange_declare(exchange="learning.events", exchange_type="topic", durable=True)
            channel.queue_declare(queue="learning.activity", durable=True)
            channel.queue_bind(queue="learning.activity", exchange="learning.events", routing_key="practice.answer_recorded")
            channel.basic_qos(prefetch_count=20)

            def on_message(ch, method, _properties, body):
                try:
                    event = json.loads(body)
                    occurred_at = datetime.fromisoformat(event["occurred_at"])
                    with Session.begin() as session:
                        session.add(Activity(
                            event_id=UUID(event["event_id"]), word_id=UUID(event["word_id"]),
                            direction=event["direction"], correct=event["correct"],
                            day=occurred_at.astimezone(TIMEZONE).date(), occurred_at=occurred_at,
                        ))
                except IntegrityError:
                    pass  # At least once delivery; event_id makes it idempotent.
                except Exception:
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                    return
                ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_consume(queue="learning.activity", on_message_callback=on_message)
            channel.start_consuming()
        except (pika.exceptions.AMQPError, OSError) as exc:
            print(f"RabbitMQ unavailable: {exc}", flush=True)
            time.sleep(5)
        finally:
            if "connection" in locals() and connection.is_open:
                connection.close()


if __name__ == "__main__":
    run()
