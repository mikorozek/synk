const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/form.html');
});

app.post('/submit', async (req, res) => {
  const { title, eventTitle, eventUrl, eventSummary, sourceUrl, sourceType } = req.body;
  try {
    const topic = await prisma.topic.create({
      data: {
        title,
        events: { create: [{ title: eventTitle, url: eventUrl, summary: eventSummary }] },
        sources: { create: [{ url: sourceUrl, type: sourceType }] }
      },
      include: { events: true, sources: true }
    });
    res.json(topic);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
