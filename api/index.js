module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    service: "telegram-auto-forward-bot",
    status: "running",
    webhook: "/api/webhook",
  });
};
