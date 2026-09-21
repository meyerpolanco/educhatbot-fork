import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

export default function App() {
  // The external site currently loops through its security challenge in an iframe.
  const SHOW_HANDBOOK = false;
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const API_BASE_URL = "http://127.0.0.1:7860";

  const handbookUrl = submittedSearch
    ? `https://livehandbook.org/search/?search=${encodeURIComponent(submittedSearch)}`
    : "https://livehandbook.org/";

  useEffect(() => {
    document.title = "AEFP Live Handbook Chatbot";

    let fontLink = document.querySelector("link[data-font='montserrat']");
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.setAttribute("data-font", "montserrat");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap";
      document.head.appendChild(fontLink);
    }

    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = "/aefp-livehandbook-logo.png";
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const next = (e.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.min(75, Math.max(25, next)));
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    if (isDragging) {
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };
  }, [isDragging]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = search.trim();
    if (!trimmed || loading) return;

    setSubmittedSearch(trimmed);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setSearch("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: trimmed })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No response returned."
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Could not reach the chatbot backend."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const introView = messages.length === 0;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        background: "#f1f1f1",
        color: "#1f2a44"
      }}
    >
      <section
        style={{
          display: SHOW_HANDBOOK ? "block" : "none",
          width: `${leftWidth}%`,
          minHeight: 0,
          background: "#ffffff",
          borderRight: "1px solid #d4dbea",
          pointerEvents: isResizing ? "none" : "auto"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <iframe
            title="Live Handbook"
            src={SHOW_HANDBOOK ? handbookUrl : undefined}
            style={{
              height: "100%",
              width: "100%",
              border: "none",
              background: "#ffffff"
            }}
          />
        </div>
      </section>

      <div
        onMouseDown={() => {
          setIsDragging(true);
          setIsResizing(true);
        }}
        style={{
          display: SHOW_HANDBOOK ? "block" : "none",
          width: "4px",
          cursor: "col-resize",
          background: "#ffffff",
          position: "relative",
          zIndex: 20,
          flexShrink: 0
        }}
        title="Drag to resize"
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "1px",
            background: isDragging ? "#d8deea" : "#e6ebf5"
          }}
        />
      </div>

      <section
        style={{
          flex: 1,
          minHeight: 0,
          background: "#f1f1f1",
          pointerEvents: isResizing ? "none" : "auto"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div
            style={{
              background: "#0865DE",
              color: "white",
              textAlign: "center",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 400,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.2,
              flexShrink: 0
            }}
          >
            <span
              style={{
                color: "#FFFFFF",
                fontFamily: "Montserrat, sans-serif",
                fontSize: "18px",
                fontStyle: "italic",
                fontWeight: 400,
                lineHeight: 1.2
              }}
            >
              An initiative of{" "}
              <span style={{ fontStyle: "normal", fontWeight: 500 }}>AEFP</span>
            </span>
          </div>

          <div
            style={{
              padding: "18px 36px 8px 36px",
              borderBottom: "1px solid #d8deea",
              background: "#f1f1f1",
              flexShrink: 0
            }}
          >
            <img
              src="/livehandbook-logo.png"
              alt="Live Handbook Education Policy Research"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = document.getElementById("logo-fallback");
                if (fallback) fallback.style.display = "block";
              }}
              style={{
                height: "56px",
                width: "auto",
                display: "block",
                marginBottom: "10px",
                background: "transparent",
                mixBlendMode: "multiply"
              }}
            />

            <div
              id="logo-fallback"
              style={{
                display: "none",
                color: "#2e67d5",
                fontSize: "28px",
                fontWeight: 600,
                marginBottom: "16px"
              }}
            >
              Live Handbook
            </div>
          </div>

          <div
            style={{
              padding: introView ? "12px 36px 22px" : "18px 36px 22px",
              background: "#f1f1f1",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                background: "#f1f1f1",
                border: "1px solid #D4DBEA",
                borderRadius: "20px",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div
                className="chat-scroll-area"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: introView ? "54px 28px 28px" : "28px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                {introView ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <div style={{ textAlign: "center", marginTop: "18px" }}>
                      <div
                        style={{
                          fontSize: "60px",
                          lineHeight: 1,
                          fontWeight: 300,
                          letterSpacing: "-0.02em",
                          color: "#0F0869",
                          fontFamily: "Montserrat, sans-serif",
                          margin: "0 0 20px 0"
                        }}
                      >
                        Ask the Handbook
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                          marginBottom: "16px"
                        }}
                      >
                        <div
                          style={{
                            background: message.role === "user" ? "#edf3ff" : "#f1f1f1",
                            border: "1px solid #cfd8eb",
                            borderRadius: "18px",
                            padding: "18px 20px",
                            maxWidth: message.role === "user" ? "60%" : "82%",
                            color: "#1f2a44",
                            lineHeight: 1.6,
                            whiteSpace: message.role === "user" ? "pre-wrap" : "normal"
                          }}
                        >
                          {message.role === "assistant" ? (
                            <Markdown
                              components={{
                                a: ({ href, children, ...props }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                )
                              }}
                            >
                              {message.content}
                            </Markdown>
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-start",
                          marginBottom: "16px"
                        }}
                      >
                        <div style={{ color: "#5f6f94", padding: "0 4px" }}>
                          Thinking...
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div
                style={{
                  padding: "18px 28px 24px",
                  borderTop: introView ? "none" : "1px solid #d8deea",
                  flexShrink: 0
                }}
              >
                <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ask a question"
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: "18px",
                      border: "1px solid #cfd8eb",
                      background: "#f1f1f1",
                      color: "#1f2a44",
                      fontSize: "15px",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "14px 20px",
                      borderRadius: "16px",
                      border: "none",
                      background: "#0865DE",
                      color: "white",
                      cursor: loading ? "default" : "pointer",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? "Thinking..." : "Ask"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            cursor: "col-resize",
            zIndex: 9999,
            background: "transparent"
          }}
        />
      )}
    </div>
  );
}
