# Trucks Up PPT Diagrams

Use the following Mermaid diagrams directly in Markdown editors that support Mermaid, or copy the structure into draw.io / PowerPoint shapes.

## ER Diagram

```mermaid
erDiagram
    USERS ||--o{ TRUCKS : owns_or_drives
    USERS ||--o{ LOADS : accepts
    TRUCKS ||--o{ LOADS : delivers

    USERS {
        int id PK
        string email
        string password
        string role
        string full_name
        string phone
        string profile_photo_url
        string preferred_language
    }

    TRUCKS {
        int id PK
        string driver
        string truck_number
        float capacity
        string status
        float latitude
        float longitude
        string driver_phone
        string driver_avatar_url
        int driver_user_id FK
        int current_load_id FK
        datetime last_location_at
    }

    LOADS {
        int id PK
        string pickup
        string drop_location
        float pickup_latitude
        float pickup_longitude
        float drop_latitude
        float drop_longitude
        string shipment_name
        string shipment_phone
        string shipment_address
        string reference_number
        float dispatch_radius_km
        float weight
        float price
        string status
        int assigned_to FK
        datetime accepted_at
        datetime created_at
    }
```

## Use Case Diagram

```mermaid
flowchart LR
    Visitor[Visitor]
    Admin[Admin]
    Driver[Driver]
    System((Trucks Up System))

    Visitor -->|View dashboard| System
    Visitor -->|View trucks| System
    Visitor -->|View loads| System
    Visitor -->|View live map| System
    Visitor -->|Register / Login| System

    Admin -->|Add truck| System
    Admin -->|Edit truck| System
    Admin -->|Delete truck| System
    Admin -->|Add load| System
    Admin -->|Edit load| System
    Admin -->|Delete load| System
    Admin -->|Track trucks on map| System

    Driver -->|Login| System
    Driver -->|View nearby loads| System
    Driver -->|Accept load| System
    Driver -->|Update live location| System
    Driver -->|Manage own truck| System
```

## DFD Level 0

```mermaid
flowchart LR
    Visitor[Visitor / User]
    Driver[Driver]
    Admin[Admin]
    System((Trucks Up Logistics Platform))
    DB[(SQLite Database)]

    Visitor -->|View dashboard data| System
    Visitor -->|Register / Login request| System
    Admin -->|Truck and load operations| System
    Driver -->|Load acceptance and location update| System

    System -->|Read / Write| DB
    System -->|Dashboard, alerts, map, auth response| Visitor
    System -->|Operational status and reports| Admin
    System -->|Nearby loads and assignments| Driver
```

## DFD Level 1

```mermaid
flowchart TB
    Visitor[Visitor]
    Admin[Admin]
    Driver[Driver]

    P1((1.0 Authentication))
    P2((2.0 Dashboard Viewing))
    P3((3.0 Truck Management))
    P4((4.0 Load Management))
    P5((5.0 Live Tracking))

    D1[(Users)]
    D2[(Trucks)]
    D3[(Loads)]

    Visitor -->|Register / Login| P1
    P1 --> D1
    P1 -->|Account response| Visitor

    Visitor -->|View dashboard| P2
    Admin -->|View dashboard| P2
    P2 --> D2
    P2 --> D3
    P2 -->|Dashboard data| Visitor
    P2 -->|Dashboard data| Admin

    Admin -->|Add / Edit / Delete truck| P3
    Driver -->|Manage own truck| P3
    P3 --> D2
    P3 -->|Truck status| Admin
    P3 -->|Truck details| Driver

    Admin -->|Add / Edit / Delete load| P4
    Driver -->|Accept load| P4
    P4 --> D3
    P4 --> D2
    P4 -->|Load assignment| Driver
    P4 -->|Load status| Admin

    Driver -->|GPS location| P5
    P5 --> D2
    P5 --> D3
    P5 -->|Map and tracking| Admin
```

## Activity Diagram

```mermaid
flowchart TD
    A([User opens website]) --> B[Dashboard opens directly]
    B --> C{Only viewing data?}
    C -->|Yes| D[Browse trucks, loads, and map]
    C -->|No, wants action| E{Logged in?}
    E -->|No| F[Redirect to register/login]
    F --> G[Create account or sign in]
    G --> H[Return to requested page]
    E -->|Yes| H
    H --> I[Perform add, edit, delete, or accept action]
    I --> J[Backend validates request]
    J --> K[Database updated]
    K --> L[Dashboard and live tracking refresh]
    L --> M([Continue until logout])
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as Visitor/User
    participant F as Frontend
    participant B as Backend API
    participant DB as SQLite DB

    U->>F: Open website
    F->>B: GET /trucks and GET /loads
    B->>DB: Fetch public dashboard data
    DB-->>B: Trucks and loads
    B-->>F: Dashboard response
    F-->>U: Show dashboard with trucks, loads, map

    U->>F: Click Add Truck / Add Load
    alt User not logged in
        F-->>U: Redirect to Register/Login
        U->>F: Submit registration/login
        F->>B: POST /auth/register or /auth/login
        B->>DB: Save user / verify user
        DB-->>B: Success
        B-->>F: Auth token + user data
        F-->>U: Allow full access
    else User already logged in
        F->>B: POST/PUT/DELETE request
        B->>DB: Update trucks or loads
        DB-->>B: Saved
        B-->>F: Success response
        F-->>U: Updated dashboard
    end
```

## Short PPT Notes

- Problem statement: manual truck and load coordination causes slow dispatch and poor visibility.
- Solution: Trucks Up gives one dashboard for trucks, loads, driver assignment, and live tracking.
- Key feature: dashboard is visible immediately, but data-changing operations require user registration/login.
- Technology summary: React frontend, Node.js/Express backend, SQLite database, Socket.IO live updates, Leaflet map tracking.
