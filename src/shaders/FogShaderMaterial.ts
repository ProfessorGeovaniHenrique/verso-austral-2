import * as THREE from 'three';
import { extend } from '@react-three/fiber';

export class FogShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00ff00') },
        uEmissiveIntensity: { value: 1.2 },
        uHoverIntensity: { value: 0.0 },
        uOpacity: { value: 0.6 },
        uPulsationSpeed: { value: 1.5 },
        uNoiseScale: { value: 2.0 },
        uNoiseIntensity: { value: 0.3 },
        uFresnelPower: { value: 2.5 },
        uCenterFade: { value: 0.4 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDistanceToCenter;
        
        uniform float uTime;
        uniform float uPulsationSpeed;
        uniform float uNoiseScale;
        uniform float uNoiseIntensity;
        
        // Simplex Noise 3D
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          
          // First corner
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          
          // Other corners
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          // Permutations
          i = mod289(i);
          vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          
          // Gradients
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          
          // Normalise gradients
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          
          // Mix final noise value
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          
          // Pulsação temporal simplificada
          float pulsation = sin(uTime * uPulsationSpeed) * 0.1 + 1.0;
          
          // Noise displacement (1 octave - otimizado)
          vec3 noisePos = position * uNoiseScale + uTime * 0.08;
          float noise = snoise(noisePos) * 0.5;
          
          // Aplicar displacement
          vec3 displacedPosition = position + normal * noise * uNoiseIntensity * pulsation;
          
          // World position
          vec4 worldPos = modelMatrix * vec4(displacedPosition, 1.0);
          vWorldPosition = worldPos.xyz;
          vPosition = displacedPosition;
          
          // Distância ao centro (para fade gradual)
          vDistanceToCenter = length(position) / length(vec3(1.0));
          
          // View direction
          vViewDirection = normalize(cameraPosition - worldPos.xyz);
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        varying vec3 vWorldPosition;
        varying float vDistanceToCenter;
        
        uniform vec3 uColor;
        uniform float uEmissiveIntensity;
        uniform float uHoverIntensity;
        uniform float uOpacity;
        uniform float uFresnelPower;
        uniform float uCenterFade;
        
        void main() {
          // Normalize vectors
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewDirection);
          
          // Fresnel volumétrico (menos dependente do ângulo)
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
          fresnel = clamp(fresnel, 0.0, 1.0);
          
          // Fade gradual do centro para fora
          float centerFade = smoothstep(0.0, uCenterFade, vDistanceToCenter);
          float edgeFade = 1.0 - smoothstep(0.7, 1.0, vDistanceToCenter);
          float volumetricFade = centerFade * edgeFade;
          
          // Cor base com emissive
          vec3 fogColor = uColor * uEmissiveIntensity;
          
          // Adicionar Fresnel glow (mais suave que no DomainShader)
          fogColor += uColor * fresnel * 1.5;
          
          // Extra glow no hover
          fogColor += vec3(1.0, 1.0, 1.0) * uHoverIntensity * fresnel * 0.8;
          
          // Opacidade final (combinando todos os fades)
          float finalOpacity = uOpacity * volumetricFade * (0.5 + fresnel * 0.5);
          
          gl_FragColor = vec4(fogColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }
}

// Register with R3F
extend({ FogShaderMaterial });

// TypeScript JSX namespace extension
declare global {
  namespace JSX {
    interface IntrinsicElements {
      fogShaderMaterial: any;
    }
  }
}
