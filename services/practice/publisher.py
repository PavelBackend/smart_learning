import json
import os
import time
from datetime import datetime, timezone

import pika
from sqlalchemy import select

from main import Base, Outbox, Session, engine


def run():
    Base.metadata.create_all(engine)
    while True:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
            channel = connection.channel()
            channel.exchange_declare(exchange="learning.events", exchange_type="topic", durable=True)
            channel.queue_declare(queue="learning.activity", durable=True)
            channel.queue_bind(queue="learning.activity", exchange="learning.events", routing_key="practice.answer_recorded")
            channel.confirm_delivery()
            while True:
                with Session.begin() as session:
                    events = session.scalars(select(Outbox).where(Outbox.published_at.is_(None)).order_by(Outbox.created_at).limit(50).with_for_update(skip_locked=True)).all()
                    for event in events:
                        channel.basic_publish(
                            exchange="learning.events", routing_key=event.routing_key,
                            body=json.dumps(event.payload).encode(),
                            properties=pika.BasicProperties(delivery_mode=2, content_type="application/json"),
                            mandatory=True,
                        )
                        event.published_at = datetime.now(timezone.utc)
                time.sleep(1 if events else 3)
        except (pika.exceptions.AMQPError, OSError) as exc:
            print(f"RabbitMQ unavailable: {exc}", flush=True)
            time.sleep(5)
        finally:
            if "connection" in locals() and connection.is_open:
                connection.close()


if __name__ == "__main__":
    run()
