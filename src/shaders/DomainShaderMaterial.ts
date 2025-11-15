import * as THREE from 'three';
import { extend } from '@react-three/fiber';

export class DomainShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00ff00') },
        uEmissiveIntensity: { value: 0.5 },
        uHoverIntensity: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uFresnelPower: { value: 3.0 },
        uWaveAmplitude: { value: 0.05 },
        uWaveFrequency: { value: 3.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        varying vec3 vPosition;
        
        uniform float uTime;
        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          
          // Wave distortion
          vec3 distortedPosition = position;
          float wave = sin(position.y * uWaveFrequency + uTime) * uWaveAmplitude;
          distortedPosition += normal * wave;
          
          vec4 worldPos = modelMatrix * vec4(distortedPosition, 1.0);
          vPosition = worldPos.xyz;
          vViewDirection = normalize(cameraPosition - worldPos.xyz);
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        
        uniform vec3 uColor;
        uniform float uEmissiveIntensity;
        uniform float uHoverIntensity;
        uniform float uOpacity;
        uniform float uFresnelPower;
        
        void main() {
          // Normalize vectors
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewDirection);
          
          // Fresnel effect
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
          fresnel = clamp(fresnel, 0.0, 1.0);
          
          // Base color with emissive
          vec3 finalColor = uColor * (1.0 + uEmissiveIntensity);
          
          // Add Fresnel glow
          finalColor += uColor * fresnel * 2.0;
          
          // Extra white glow on hover
          finalColor += vec3(1.0) * fresnel * uHoverIntensity * 0.5;
          
          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `,
      transparent: true
    });
  }
}

// Register with R3F
extend({ DomainShaderMaterial });

// TypeScript JSX namespace extension
declare global {
  namespace JSX {
    interface IntrinsicElements {
      domainShaderMaterial: any;
    }
  }
}
