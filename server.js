const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Keys
const OPENWEATHER_API_KEY = '779b7dc10f0e3713d126315f51a871aa';
const NEWSDATA_API_KEY = 'pub_1f05459b885f4a9cb8468b85f570f7a1';

// Initialize databases
const reportsDb = new Datastore({ filename: 'reports.db', autoload: true });
const usersDb = new Datastore({ filename: 'users.db', autoload: true });
const ngosDb = new Datastore({ filename: 'ngos.db', autoload: true });

// Initial data
const initialUsers = [
  { 
    username: 'user', 
    password: 'password', 
    role: 'user', 
    karma: 100,
    joinedDate: new Date().toISOString()
  },
  { 
    username: 'admin', 
    password: 'adminpassword', 
    role: 'admin', 
    karma: 999,
    joinedDate: new Date().toISOString()
  },
  { 
    username: 'TirupatiGreenFoundation', 
    password: 'ngo_password', 
    role: 'ngo',
    joinedDate: new Date().toISOString()
  },
  { 
    username: 'CleanCityNGO', 
    password: 'ngo_password', 
    role: 'ngo',
    joinedDate: new Date().toISOString()
  }
];

const initialReports = [
  { 
    id: 1, 
    title: "Pothole on Main Street", 
    description: "Large pothole causing traffic issues and vehicle damage near the market area.", 
    photo: "https://via.placeholder.com/150", 
    lat: 13.6345, 
    lng: 79.4198, 
    username: "user", 
    votes: 15, 
    status: "pending", 
    comments: [],
    category: "infrastructure",
    createdAt: new Date().toISOString(),
    voters: []
  },
  { 
    id: 2, 
    title: "Garbage Accumulation in Park", 
    description: "Trash piling up in the central park, creating health hazards and bad odor.", 
    photo: "https://via.placeholder.com/150", 
    lat: 13.6321, 
    lng: 79.4173, 
    username: "user", 
    votes: 23, 
    status: "pending", 
    comments: [],
    category: "sanitation",
    createdAt: new Date().toISOString(),
    voters: []
  },
  { 
    id: 3, 
    title: "Broken Street Lights", 
    description: "Multiple street lights not working on Gandhi Road, making it unsafe at night.", 
    photo: "https://via.placeholder.com/150", 
    lat: 13.6308, 
    lng: 79.4152, 
    username: "user", 
    votes: 18, 
    status: "inprogress", 
    comments: [],
    category: "safety",
    createdAt: new Date().toISOString(),
    voters: [],
    assignedToNgo: "TirupatiGreenFoundation"
  },
  { 
    id: 4, 
    title: "Water Logging During Rain", 
    description: "Area near bus stand gets flooded even with light rainfall, affecting commuters.", 
    photo: "https://via.placeholder.com/150", 
    lat: 13.6289, 
    lng: 79.4136, 
    username: "user", 
    votes: 12, 
    status: "pending", 
    comments: [],
    category: "infrastructure",
    createdAt: new Date().toISOString(),
    voters: []
  },
  { 
    id: 5, 
    title: "Public Toilet Maintenance", 
    description: "Public toilet near railway station needs cleaning and basic maintenance.", 
    photo: "https://via.placeholder.com/150", 
    lat: 13.6267, 
    lng: 79.4119, 
    username: "user", 
    votes: 9, 
    status: "resolved", 
    comments: [],
    category: "sanitation",
    createdAt: new Date().toISOString(),
    voters: [],
    assignedToNgo: "CleanCityNGO"
  }
];

const initialNgos = [
  { 
    name: "Tirupati Green Foundation", 
    description: "A local NGO focused on tree plantation, waste segregation, and climate awareness.", 
    contact: "info@tirupatigreen.org", 
    contactPerson: "Suresh Reddy",
    username: "TirupatiGreenFoundation"
  },
  { 
    name: "Clean City NGO", 
    description: "Working on urban cleanliness, public sanitation, and waste management solutions.", 
    contact: "contact@cleancity.org", 
    contactPerson: "Priya Sharma",
    username: "CleanCityNGO"
  }
];

// Seed databases
reportsDb.count({}, (err, count) => {
  if (count === 0) {
    reportsDb.insert(initialReports);
  }
});

usersDb.count({}, (err, count) => {
  if (count === 0) {
    usersDb.insert(initialUsers);
  }
});

ngosDb.count({}, (err, count) => {
  if (count === 0) {
    ngosDb.insert(initialNgos);
  }
});

// Utility function to generate unique ID
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// API Endpoints

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  usersDb.findOne({ username: username, password: password }, (err, user) => {
    if (user) {
      res.json({ success: true, user: user });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// Get all reports with sorting
app.get('/api/reports', (req, res) => {
  const { sort = 'recent', filter = 'all' } = req.query;
  
  let query = {};
  if (filter !== 'all') {
    query.status = filter;
  }
  
  reportsDb.find(query).sort({ id: -1 }).exec((err, docs) => {
    if (sort === 'voted') {
      docs.sort((a, b) => b.votes - a.votes);
    }
    res.json(docs);
  });
});

// Create new report
app.post('/api/reports', (req, res) => {
  const newReport = { 
    ...req.body, 
    id: generateId(),
    createdAt: new Date().toISOString(),
    voters: [],
    comments: []
  };
  
  reportsDb.insert(newReport, (err, newDoc) => {
    if (err) {
      res.status(500).json({ error: 'Failed to create report' });
    } else {
      res.status(201).json(newDoc);
    }
  });
});

// Vote on report - FIXED to prevent redirects
app.put('/api/reports/:id/vote', (req, res) => {
  const reportId = parseInt(req.params.id);
  const { username } = req.body;
  
  reportsDb.findOne({ id: reportId }, (err, report) => {
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    const hasVoted = report.voters.includes(username);
    let updateQuery = {};
    
    if (hasVoted) {
      // Remove vote
      updateQuery = { 
        $inc: { votes: -1 },
        $pull: { voters: username }
      };
    } else {
      // Add vote
      updateQuery = { 
        $inc: { votes: 1 },
        $push: { voters: username }
      };
    }
    
    reportsDb.update({ id: reportId }, updateQuery, {}, (err, numReplaced) => {
      if (numReplaced > 0) {
        reportsDb.findOne({ id: reportId }, (err, updatedDoc) => {
          // Update user karma
          if (!hasVoted) {
            usersDb.update(
              { username: username }, 
              { $inc: { karma: 1 } }, 
              {}, 
              () => {}
            );
          }
          res.json(updatedDoc);
        });
      } else {
        res.status(404).json({ message: 'Report not found' });
      }
    });
  });
});

// Update report status
app.put('/api/reports/:id/status', (req, res) => {
  const reportId = parseInt(req.params.id);
  const { status } = req.body;
  reportsDb.update({ id: reportId }, { $set: { status: status } }, {}, (err, numReplaced) => {
    if (numReplaced > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  });
});

// Delete report
app.delete('/api/reports/:id', (req, res) => {
  const reportId = parseInt(req.params.id);
  reportsDb.remove({ id: reportId }, {}, (err, numRemoved) => {
    if (numRemoved > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  });
});

// Add comment
app.put('/api/reports/:id/comment', (req, res) => {
  const reportId = parseInt(req.params.id);
  const newComment = {
    ...req.body,
    id: generateId(),
    timestamp: new Date().toISOString()
  };
  
  reportsDb.update({ id: reportId }, { $push: { comments: newComment } }, {}, (err, numReplaced) => {
    if (numReplaced > 0) {
      reportsDb.findOne({ id: reportId }, (err, doc) => {
        res.json(doc);
      });
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  });
});

// Get user's reports
app.get('/api/reports/user/:username', (req, res) => {
  const username = req.params.username;
  reportsDb.find({ username: username }).sort({ id: -1 }).exec((err, docs) => {
    res.json(docs);
  });
});

// NGO endpoints
app.get('/api/ngos', (req, res) => {
  ngosDb.find({}, (err, docs) => {
    res.json(docs);
  });
});

// Get reports assigned to an NGO - FIXED to work with NGO username
app.get('/api/reports/ngo/:ngoUsername', (req, res) => {
  const ngoUsername = req.params.ngoUsername;
  
  // First find the NGO by username to get the NGO name
  ngosDb.findOne({ username: ngoUsername }, (err, ngo) => {
    if (ngo) {
      // Then find reports assigned to this NGO by name
      reportsDb.find({ assignedToNgo: ngo.name }).sort({ id: -1 }).exec((err, docs) => {
        res.json(docs);
      });
    } else {
      res.json([]);
    }
  });
});

// Assign report to NGO - FIXED to use NGO name
app.put('/api/reports/:id/assign-ngo', (req, res) => {
  const reportId = parseInt(req.params.id);
  const { ngoName } = req.body;
  
  reportsDb.update({ id: reportId }, { 
    $set: { 
      assignedToNgo: ngoName, 
      status: 'inprogress' 
    } 
  }, {}, (err, numReplaced) => {
    if (numReplaced > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  });
});

// Real Weather API
app.get('/api/weather', async (req, res) => {
  try {
    // Default to Tirupati coordinates
    const lat = 13.6333;
    const lon = 79.4167;
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error('Weather API failed');
    }
    
    const data = await response.json();
    
    const weatherData = {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      location: data.name,
      feelsLike: Math.round(data.main.feels_like),
      pressure: data.main.pressure
    };
    
    res.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    // Fallback data
    res.json({
      temperature: 28,
      description: "Partly cloudy",
      icon: "02d",
      humidity: 65,
      windSpeed: 3.5,
      location: "Tirupati",
      feelsLike: 30,
      pressure: 1013
    });
  }
});

// Real News API
app.get('/api/news/:category', async (req, res) => {
  try {
    const category = req.params.category;
    
    let query = 'india';
    if (category === 'world') {
      query = 'world';
    }
    
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${query}&language=en`
    );
    
    if (!response.ok) {
      throw new Error('News API failed');
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const news = data.results.slice(0, 5).map(article => ({
        title: article.title,
        description: article.description || 'No description available',
        source: article.source_id || 'Unknown Source',
        publishedAt: article.pubDate,
        url: article.link,
        image: article.image_url
      }));
      res.json(news);
    } else {
      // Fallback news
      res.json(getFallbackNews(category));
    }
  } catch (error) {
    console.error('News API error:', error);
    res.json(getFallbackNews(req.params.category));
  }
});

function getFallbackNews(category) {
  if (category === 'local') {
    return [
      {
        title: "Tirupati Smart City Project Progress",
        description: "New infrastructure developments in the city center.",
        source: "Local Times",
        publishedAt: new Date().toISOString(),
        url: "#"
      },
      {
        title: "Community Cleanup Drive This Weekend",
        description: "Volunteers needed for city-wide cleanup initiative.",
        source: "Community Bulletin",
        publishedAt: new Date().toISOString(),
        url: "#"
      }
    ];
  } else {
    return [
      {
        title: "Global Climate Summit Reaches New Agreement",
        description: "World leaders agree on new climate targets for 2030.",
        source: "Global News",
        publishedAt: new Date().toISOString(),
        url: "#"
      },
      {
        title: "Tech Giants Announce AI Safety Standards",
        description: "Major tech companies collaborate on AI safety framework.",
        source: "Tech Daily",
        publishedAt: new Date().toISOString(),
        url: "#"
      }
    ];
  }
}

// User profile
app.get('/api/user/:username', (req, res) => {
  const username = req.params.username;
  usersDb.findOne({ username: username }, (err, user) => {
    if (user) {
      // Get user's reports for additional stats
      reportsDb.find({ username: username }, (err, reports) => {
        const userStats = {
          ...user,
          totalReports: reports.length,
          resolvedReports: reports.filter(r => r.status === 'resolved').length,
          totalVotes: reports.reduce((sum, report) => sum + report.votes, 0)
        };
        res.json(userStats);
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });
});

app.listen(port, () => {
  console.log(`CivicEye backend running at http://localhost:${port}`);
});