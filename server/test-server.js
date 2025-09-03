// test-server.js - Run this to understand your server's dual nature
const http = require('http');
const WebSocket = require('ws');

// Test 1: HTTP Interface (for your portfolio)
function testHttpInterface() {
  console.log('🌐 Testing HTTP Interface (Portfolio Frontend)...');
  
  const options = {
    hostname: 'localhost',
    port: 3000, // adjust to your server port
    path: '/metrics',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ HTTP Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📋 HTTP Response:', data);
      console.log('👉 This is how your PORTFOLIO WEBSITE will talk to your server\n');
    });
  });

  req.on('error', (e) => {
    console.log(`❌ HTTP Error: ${e.message}`);
  });

  req.end();
}

// Test 2: WebSocket Interface (for real-time features)
function testWebSocketInterface() {
  console.log('🔌 Testing WebSocket Interface (Real-time Updates)...');
  
  const ws = new WebSocket('ws://localhost:3001'); // adjust to your WebSocket port
  
  ws.on('open', function open() {
    console.log('✅ WebSocket Connected');
    
    // Send a test message
    ws.send(JSON.stringify({
      type: 'test',
      message: 'Hello from test client'
    }));
    
    console.log('👉 This is how REAL-TIME UPDATES will flow to your frontend\n');
  });

  ws.on('message', function message(data) {
    console.log('📨 WebSocket Response:', data.toString());
  });

  ws.on('error', function error(err) {
    console.log(`❌ WebSocket Error: ${err.message}`);
  });
}

// Test 3: MCP Protocol Simulation (how Claude.ai talks to your server)
function testMCPInterface() {
  console.log('🤖 Simulating MCP Protocol (Claude.ai Interface)...');
  
  // This simulates what Claude.ai sends to your server
  const mcpRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getCareerInsights',
    params: {
      timeframe: '3months',
      focus: 'skills'
    }
  };
  
  console.log('📤 MCP Request (what Claude sends):');
  console.log(JSON.stringify(mcpRequest, null, 2));
  
  // This would be your server's response
  const mcpResponse = {
    jsonrpc: '2.0',
    id: 1,
    result: {
      skillGaps: ['Docker', 'Kubernetes'],
      strongAreas: ['React', 'TypeScript', 'Node.js'],
      recommendations: [
        'Build a containerized project',
        'Learn CI/CD pipelines',
        'Practice system design interviews'
      ]
    }
  };
  
  console.log('📥 MCP Response (what your server sends back):');
  console.log(JSON.stringify(mcpResponse, null, 2));
  console.log('👉 This is how CLAUDE.AI gets intelligent data about your career\n');
}

// Run all tests
console.log('🔍 UNDERSTANDING YOUR MCP SERVER ARCHITECTURE\n');
console.log('Your server has THREE interfaces:\n');

testHttpInterface();
setTimeout(testWebSocketInterface, 1000);
setTimeout(testMCPInterface, 2000);

setTimeout(() => {
  console.log('🎯 KEY INSIGHT:');
  console.log('Your server is like a smart translator that:');
  console.log('• Speaks HTTP to your portfolio website');
  console.log('• Speaks WebSocket for real-time updates'); 
  console.log('• Speaks MCP protocol to Claude.ai');
  console.log('• All using the SAME underlying Notion data!\n');
  
  console.log('Next: Look at server/src/handlers.ts to see the functions Claude can call');
}, 3000);