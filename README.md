

# GreenNest: AI-Powered Plant Disease Detection and Management

**GreenNest** is an innovative cross-platform solution (Mobile & Web) that leverages advanced Deep Learning to help farmers, agriculturists, and plant enthusiasts detect plant leaf diseases instantly with high accuracy. By combining a state-of-the-art AI pipeline with actionable remediation suggestions (powered by Gemini LLM) and a rich plant species library, GreenNest promotes sustainable, data-driven farming practices and supports global food security.

## ✨ Key Features

* **High Classification Accuracy**: Achieved **98.78% accuracy** in plant disease identification using ResNet-50 with transfer learning.
* **Three-Stage AI Pipeline**:

  * **YOLOv8**: Robust leaf object detection and localization.
  * **ResNet-50**: Fine-grained disease classification.
  * **Gemini 2.5 LLM**: Generates actionable disease remediation suggestions.
* **Cross-Platform Accessibility**: Fully functional on Mobile (Flutter) and Web platforms.
* **Real-Time Detection**: Immediate diagnostics and treatment plans upon image upload.
* **Comprehensive Species Library**: Access a database of **460,000+ plant species** with detailed information.
* **Health Monitoring Dashboard**: Track historical health and growth of user-defined “Tracked Plants.”

##  Technology Stack

GreenNest is built on a modular architecture with a Node.js MVC core and a dedicated Flask backend for AI.

| Component         | Technology                                 | Role                                                                |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Backend           | Node.js (Express)      | Application logic, user authentication, data storage, API endpoints |
| AI Backend        | Flask, PyTorch, torchvision, NumPy, Pandas | Serves Deep Learning models (ResNet-50, YOLOv8)                     |
| Frontend (Web)    | EJS                                       | Web user interface                                                  |
| Frontend (Mobile) | Flutter                                    | Cross-platform development for Android & iOS                        |
| AI / LLM          | ResNet-50, YOLOv8, Gemini 2.5 LLM          | Disease classification, object detection, remediation suggestions   |
| Hosting           | GCP Compute Engine, Nginx, Cloud Buckets   | App hosting, proxy, and storage for user-uploaded images            |
| Database          | MongoDB                                    | Stores user data, scan history, and plant library                   |

## 📐 System Architecture

The system follows a **Model-View-Controller (MVC)** design for the Node.js backend to ensure scalability, maintainability, and separation of concerns.

**High-Level Components**:

* **Users**: Interact with the Load Balancer (via Web/Mobile).
* **Load Balancer**: Routes requests efficiently.
* **Detection Service**: Core logic for request validation and coordination.
* **Triple model setup**: Processes images, performs detection, and returns results.

---

## Documentation & Resources

* Full Project Documentation: [Google Docs](https://docs.google.com/document/d/11eoAMJHJyZ9cZ2btbNftsiTqk6MZY1tW/edit?usp=sharing&ouid=104399422118441291398&rtpof=true&sd=true)
* API Documentation: [Postman](https://documenter.getpostman.com/view/40053537/2sB2cd5ydq#intro)

## 🖼 Screenshots

### Home Page
<img width="800" alt="Home Page" src="https://github.com/user-attachments/assets/8c6221fe-5c42-44cf-b646-a5ec5b6b9d31" />

### Dashboard
<img width="800" alt="Dashboard" src="https://github.com/user-attachments/assets/b2483a36-e017-4259-af3b-d6c9349ee839" />

### Register Page
<img width="800" alt="Register Page" src="https://github.com/user-attachments/assets/510639ee-6f0d-4952-b2a5-5652264b6ab3" />

### Species Library
<img width="800" alt="Species Library" src="https://github.com/user-attachments/assets/ac8cd52e-e29f-4d50-9cdc-89f759a74656" />

### Begin Scan / Upload Image
<img width="800" alt="Begin Scan / Upload" src="https://github.com/user-attachments/assets/05bf2e8b-d2b9-43c4-bf45-5eb3d80f0374" />

### Disease Remediations
<img width="800" alt="Disease Remediations" src="https://github.com/user-attachments/assets/5c4e271f-2866-4465-8255-56780603bebd" />
