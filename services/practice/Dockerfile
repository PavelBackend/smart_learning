FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY services/__init__.py ./services/__init__.py
COPY services/practice ./services/practice
CMD ["uvicorn", "services.practice.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
