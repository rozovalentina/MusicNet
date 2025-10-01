# 🎹 MusicNet  
*A Browser-Based Multiplayer Platform for Piano Learning with Real-Time Audio Synchronization*  

[![Live Demo](https://img.shields.io/badge/demo-online-green)](https://musicnet.surge.sh/)  
[![GitHub License](https://img.shields.io/github/license/rozovalentina/musicnet)](LICENSE)  
[![Made with Phaser](https://img.shields.io/badge/game--engine-Phaser-blue)](https://phaser.io/)  
[![WebRTC](https://img.shields.io/badge/communication-WebRTC-orange)](https://webrtc.org/)  

---

## 📖 Overview  
**MusicNet** is a browser-based multiplayer platform for piano education that enables real-time interaction, resilience under unstable network conditions, and gamified learning experiences.  

The system combines:  
- 🎶 **Real-time pitch detection** via microphone input.  
- 🎮 **Gamified feedback** to enhance motivation and engagement.  
- 🌐 **WebRTC peer-to-peer networking** for multiplayer gameplay.  
- 🤖 **AI-powered packet loss recovery (PARCnet)** for robust audio streaming.  

MusicNet is built entirely in the browser — no installations or special hardware required.  

---

## ⚙️ Features  
- Multiplayer piano practice sessions over the web.  
- Real-time pitch detection and mapping to game avatars.  
- Low-latency audio streaming with WebRTC.  
- Deep learning–based packet loss concealment (PARCnet).  
- Public deployment and open-source code for reproducibility.  

---

## 🚀 Deployment  
A live version of **MusicNet** is publicly accessible:  

👉 [musicnet.surge.sh](https://musicnet.surge.sh/)  

---

## 🏗️ System Architecture  
MusicNet is composed of three main components:  

1. **Main Web Application (this repo)**  
   - Phaser-based browser game.  
   - Client-side pitch detection (AubioJS).  
   - WebRTC integration.  

2. **[Signaling Server](https://github.com/rozovalentina/musicnet-signaling-server)**  
   - Built with **Node.js + Socket.IO**.  
   - Manages room creation, ICE exchange, and session recovery.  

3. **[Note Detection & PARCnet Module](https://github.com/ValeLopezCubillos/parcnet)**  
   - Python-based backend.  
   - Implements predictive audio packet loss concealment (IEEE IS² 2024 PARCnet).  

---

## 📂 Resources and Demonstrations  

- **Main Repository:** [MusicNet](https://github.com/rozovalentina/musicnet)  
- **Signaling Server:** [musicnet-signaling-server](https://github.com/rozovalentina/musicnet-signaling-server)  
- **Note Detection & PARCnet Module:** [parcnet](https://github.com/ValeLopezCubillos/parcnet)  
- **Playable Deployment:** [musicnet.surge.sh](https://musicnet.surge.sh/)  

### 🎥 Demonstration Videos
- [Multiplayer Gameplay](https://drive.google.com/file/d/1RGbOKwp2NmQil50uk_ML2v9Gvr4ikjT1/view?usp=drive_link)  
- [Single-Player Gameplay with Network Simulation (Clumsy)](https://drive.google.com/file/d/1WrYYPnONUd3QI4ZIV0VGTL8qIjpCy8lo/view?usp=drive_link)  

### 📘 Project Documentation & Diagrams  
All system diagrams (architecture, sequence, class, deployment) are available in the **Software Documentation Repository**, which contains:  

- **Software Requirements Specification (SRS)**  
- **Software Design Document (SDD)**  
- **Project Management Plan (PMP)**  

👉 [Full Documentation Repository](https://github.com/rozovalentina/musicnet-docs)  

---

## 🧪 Testing Setup  
We used **Clumsy** for controlled network degradation testing:  
👉 [Clumsy: Network Simulator](https://jagt.github.io/clumsy/)  

Performance metrics evaluated:  
- Latency and jitter tolerance.  
- Pitch detection accuracy.  
- User satisfaction (ISO 9241-11).  

---

## 📑 Citation  
If you use MusicNet in your research or teaching, please cite:  

```bibtex
@misc{musicnet2025,
  author       = {Rozo-Gonzalez, Valentina and Lopez-Cubillos, Paula Valentina},
  title        = {MusicNet: Source Code and Documentation},
  year         = {2025},
  howpublished = {GitHub},
  url          = {https://github.com/rozovalentina/musicnet}
}
---

