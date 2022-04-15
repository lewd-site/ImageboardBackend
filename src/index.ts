import http from 'http';
import createApp from './app';
import config from './config';
import Container from './container';
import registerServices from './services';

const container = new Container();
registerServices(container);

const app = createApp(container);
http.createServer(app.callback()).listen(config.http.port);
