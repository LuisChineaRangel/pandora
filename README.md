![image](https://github.com/iluzioDev/pandora/assets/45295283/101a0246-d12b-4fc5-aa2f-0a091a96cffa)# Pandora

[![Netlify Status](https://api.netlify.com/api/v1/badges/752862b9-8a36-42ed-95a3-7e60e2677d33/deploy-status)](https://app.netlify.com/sites/pandora-ecc/deploys)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=iluzioDev_pandora&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=iluzioDev_pandora)

Pandora is a web application that allows users to create simulations of elliptic cryptographic systems and test various types of attacks on them. The application is developed following a two-layer architecture, with a presentation layer developed in Angular and a services layer developed in Flask.

You can access the application at the following [link](https://pandora-ecc.netlify.app/).

## Features

- Customizable elliptic curve configuration and visualization.
- Generation of public and private keys.
- Encryption and decryption of messages.
- Elliptic curve attack using SETUP, Pollig-Hellman, and Baby-Step Giant-Step algorithms.

## Installation Requirements

- Python 3.11
- Node.js 20.0.0
- Angular 18

## Installation

1. Clone the repository:

```bash
git clone https://github.com/iluzioDev/pandora.git
```

2. Install the dependencies of the services layer

```bash
cd pandora/backend
pip install -r requirements.txt
```

3. Install the dependencies of the presentation layer

```bash
cd pandora/frontend
npm install
```

4. Configure the address of the services layer in the file `pandora/frontend/src/app/app.config.ts`

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from '@app/core/app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';

export const SERVER_URL = 'http://localhost:5000'

export const appConfig: ApplicationConfig = {
    providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideAnimationsAsync(), provideHttpClient()],
};
```

## Execution

1. Run the services layer:

```bash
cd pandora/backend
python run.py
```

2. Run the presentation layer:

```bash
cd pandora/frontend
ng serve
```

The console output will be something similar to the following:

```bash
 * Serving Flask app 'pandora'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://localhost:5000
Press CTRL+C to quit
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: XXX-XXX-XXX
```

Open your browser and go to the address indicated in the presentation layer configuration, by default `http://localhost:4200`.

## Usage

Pandora features an intuitive and user-friendly interface. On the main page, the user can configure a custom elliptic curve and generate public and private keys. Additionally, users can encrypt and decrypt messages using the generated keys.

![Pandora App](https://github.com/iluzioDev/pandora/assets/45295283/af7b08a6-7062-404c-87cf-25cbdcecc509)

By accessing the side menu, the user can go to the attacks section, where they can select a type of attack and run tests on the configured elliptic curve.

![Attacks](https://github.com/iluzioDev/pandora/assets/45295283/2d24a26a-b536-4a26-b495-4b2179c45451)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE.md) file for details.
