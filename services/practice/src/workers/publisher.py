import json
import time
from datetime import datetime, timezone

import pika

from shared.messaging import EXCHANGE, declare_activity_channel

from ..config import get_rabbit_settings
from ..db import SessionLocal
from ..repositories.practice import PracticeRepository


def run() -> None:
    settings = get_rabbit_settings()
    while True:
        connection = None
        try:
            connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
            channel = connection.channel()
            declare_activity_channel(channel)
            channel.confirm_delivery()
            while True:
                with SessionLocal.begin() as session:
                    events = PracticeRepository(session).pending_events()
                    for event in events:
                        channel.basic_publish(
                            exchange=EXCHANGE,
                            routing_key=event.routing_key,
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
            if connection is not None and connection.is_open:
                connection.close()


if __name__ == "__main__":
    run()
