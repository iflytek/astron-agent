import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ChatClawBuilder from './pages/ChatClawBuilder';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/chatclaw" component={ChatClawBuilder} />
        <Route path="/" exact component={ChatClawBuilder} />
      </Switch>
    </Router>
  );
}

export default App;