import {
  ArrowRight,
  Check,
  Clipboard,
  CloudUpload,
  Download,
  FileJson,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function ImportWords() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = async (next: File | undefined) => {
    setError("");
    setMessage("");
    setFile(null);
    setPreview([]);
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".json")) {
      setError("Нужен файл с расширением .json");
      return;
    }
    if (next.size > 2_000_000) {
      setError("Максимальный размер файла — 2 МБ");
      return;
    }
    try {
      const parsed = JSON.parse(await next.text());
      const words = Array.isArray(parsed) ? parsed : parsed.words;
      if (!Array.isArray(words) || words.length === 0)
        throw new Error("В файле нужен непустой массив words");
      setPreview(
        words
          .slice(0, 4)
          .map(
            (word: { english?: string; translations?: string[] }) =>
              `${word.english ?? "?"} — ${word.translations?.join(", ") ?? "?"}`,
          ),
      );
      setFile(next);
    } catch (e) {
      setError(`Не удалось прочитать JSON: ${(e as Error).message}`);
    }
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDrag(false);
    void selectFile(event.dataTransfer.files[0]);
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    void selectFile(event.target.files?.[0]);
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.importWords(file);
      setMessage(
        `Готово: добавлено ${result.created}, обновлено ${result.updated}.`,
      );
      setFile(null);
      setPreview([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copyPrompt = async () => {
    try {
      const response = await fetch("/word-prompt.md");
      await navigator.clipboard.writeText(await response.text());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Не удалось скопировать промпт. Скачай файл ниже.");
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> ОТ СЫРОГО СПИСКА К ЖИВОМУ СЛОВАРЮ
          </div>
          <h1>
            Импорт слов <span className="heading-star">✳</span>
          </h1>
          <p>Один JSON-файл — и целая подборка готова к практике.</p>
        </div>
      </div>
      <div className="import-layout">
        <section className="import-main">
          <div className="step-heading">
            <span>01</span>
            <div>
              <span className="panel-kicker">ПОДГОТОВЬ СЛОВА</span>
              <h2>Попроси нейросеть оформить слова</h2>
              <p>
                Скопируй готовый промпт, добавь в него свои английские слова и
                сохрани ответ как <b>.json</b>.
              </p>
            </div>
          </div>
          <div className="prompt-card">
            <div className="prompt-card-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <strong>Промпт для подготовки JSON</strong>
              <p>Переводы, примеры, часть речи и теги — в одном формате.</p>
            </div>
            <button className="copy-button" onClick={() => void copyPrompt()}>
              {copied ? <Check size={17} /> : <Clipboard size={17} />}
              {copied ? "Скопировано" : "Скопировать"}
            </button>
          </div>
          <div className="file-links">
            <a href="/word-prompt.md" download>
              <FileText size={17} /> Скачать промпт <Download size={15} />
            </a>
            <a href="/example-words.json" download>
              <FileJson size={17} /> Пример JSON <Download size={15} />
            </a>
          </div>
          <div className="step-divider" />
          <div className="step-heading">
            <span>02</span>
            <div>
              <span className="panel-kicker">ЗАГРУЗИ ФАЙЛ</span>
              <h2>Добавь подборку в словарь</h2>
              <p>
                Повторный импорт обновит слова с тем же английским написанием.
              </p>
            </div>
          </div>
          <div
            className={`dropzone ${drag ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter") inputRef.current?.click();
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              onChange={onChange}
              hidden
            />
            <div className="drop-icon">
              {file ? <FileJson size={30} /> : <CloudUpload size={30} />}
            </div>
            <strong>{file ? file.name : "Перетащи JSON-файл сюда"}</strong>
            <p>
              {file
                ? `${(file.size / 1024).toFixed(1)} КБ · готов к импорту`
                : "или нажми, чтобы выбрать на компьютере"}
            </p>
            <span className="drop-format">JSON · до 2 МБ</span>
          </div>
          {file && (
            <div className="file-preview">
              <div>
                <strong>Предпросмотр</strong>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                  }}
                  aria-label="Убрать файл"
                >
                  <X size={17} />
                </button>
              </div>
              {preview.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          )}
          {error && <div className="alert">{error}</div>}
          {message && (
            <div className="success-message">
              <Check size={18} /> {message}{" "}
              <Link to="/dictionary">
                Открыть словарь <ArrowRight size={16} />
              </Link>
            </div>
          )}
          <button
            className="primary-button import-button"
            disabled={!file || busy}
            onClick={() => void upload()}
          >
            <Upload size={18} />{" "}
            {busy ? "Импортируем..." : "Импортировать слова"}
          </button>
        </section>
        <aside className="import-aside">
          <div className="tip-panel">
            <div className="tip-panel-star">✳</div>
            <span className="panel-kicker">ПОДСКАЗКА</span>
            <h3>
              Хороший пример
              <br />
              помогает запомнить
            </h3>
            <p>
              В промпте нейросеть создаёт короткие живые предложения. Они
              появятся после ответа в тренировке.
            </p>
            <div className="tip-example">
              <span>ENGLISH</span>
              <strong>It was a pleasant surprise.</strong>
              <span>РУССКИЙ</span>
              <strong>Это был приятный сюрприз.</strong>
            </div>
          </div>
          <div className="privacy-panel">
            <div>◈</div>
            <strong>Только на твоём ноутбуке</strong>
            <p>
              Слова хранятся локально в PostgreSQL. Нейросеть используется
              только вручную для подготовки файла.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
