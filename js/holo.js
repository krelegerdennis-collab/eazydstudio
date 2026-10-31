import * as THREE from './three.module.min.js';
const ease=x=>1-Math.pow(1-Math.min(Math.max(x,0),1),3);
function glowTex(stops){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);stops.forEach(([o,s])=>gr.addColorStop(o,s));g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
export function start(hero){
  let r;try{r=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch(e){return false;}
  r.domElement.setAttribute('aria-hidden','true');r.domElement.className='holo-canvas';
  r.setPixelRatio(Math.min(devicePixelRatio,1.5));hero.prepend(r.domElement);
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,100);cam.position.set(0,-.35,6);
  const mobile=innerWidth<700, root=new THREE.Group();scene.add(root);
  const tex=new THREE.TextureLoader().load(new URL('../img/logo-holo-tex.webp',import.meta.url).href,()=>{hero.classList.add('gl');tIntro=performance.now();loop();});
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const add=THREE.AdditiveBlending;
  // back glow layers (cheap "bloom")
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex([[0,'rgba(80,220,255,.28)'],[.3,'rgba(40,120,255,.12)'],[1,'rgba(0,0,0,0)']]),blending:add,depthWrite:false,transparent:true}));
  halo.scale.set(4.2,4.2,1);halo.position.z=-.4;root.add(halo);
  const warm=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex([[0,'rgba(255,140,26,.25)'],[.5,'rgba(255,100,20,.06)'],[1,'rgba(0,0,0,0)']]),blending:add,depthWrite:false,transparent:true}));
  warm.scale.set(2.6,2.6,1);warm.position.z=-.2;root.add(warm);
  const lt=new THREE.TextureLoader().load(new URL('../img/logo-letters-tex.webp',import.meta.url).href);
  const U={t:{value:0},map:{value:tex},lt:{value:lt},intro:{value:0},boost:{value:1}};
  const frag=`uniform sampler2D map,lt;uniform float t,intro,boost;varying vec2 vUv;varying vec3 vN,vV;
    float m(vec2 u){vec4 c=texture2D(map,u);float lum=max(c.r,max(c.g,c.b));return c.a*smoothstep(.45,.6,lum);}
    void main(){float band=step(.985,fract(vUv.y*6.-t*.35));float g=band*.03*sin(t*50.);vec2 uv=vUv+vec2(g,0.);
    float build=1.-smoothstep(intro-.08,intro,1.-vUv.y);float edge=smoothstep(.06,0.,abs((1.-vUv.y)-intro))*step(intro,1.02);
    vec4 c=texture2D(map,uv);float a=m(uv);
    float d=.014,h=0.;for(int i=0;i<8;i++){float an=float(i)*.785;h+=m(uv+vec2(cos(an),sin(an))*d);}h/=8.;
    float rim=clamp(h-a,0.,1.);float ab=m(uv+vec2(.005,0)),ar=m(uv-vec2(.005,0));
    float scan=.8+.2*sin(vUv.y*300.-t*5.);float fres=pow(1.-abs(dot(vN,vV)),2.);
    vec3 col=c.rgb*1.15*scan*a+vec3(.3,.9,1.)*(.1+fres*.6)*a+vec3(.3,.9,1.)*rim*1.8*boost+vec3(1.,.55,.1)*max(ar-a,0.)+vec3(.2,.55,1.)*max(ab-a,0.);
    float fl=.95+.05*sin(t*31.)*sin(t*11.);float al=max(a*(.9+.1*scan),rim*.95+max(ab,ar)*(1.-a)*.6);
    float L=texture2D(lt,uv).r;vec3 fill=mix(vec3(.02,.08,.25),vec3(.1,.75,1.),smoothstep(.75,.25,vUv.y)*.55+.25*sin(vUv.y*300.-t*5.)*.2+fres*.4);fill+=vec3(.3,.9,1.)*.25*sin(vUv.x*8.-t*1.5)*sin(vUv.y*6.+t)*L;col=mix(col,fill*scan,L);al=max(al,L*.93);a=max(a,L);
    col+=vec3(.5,1.,1.)*edge*a*2.;al*=build;if(al<.02)discard;gl_FragColor=vec4(col*fl,al*fl);}`;
  const vert=`varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  const logo=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,vertexShader:vert,fragmentShader:frag}));
  root.add(logo);
  // ghost echo layer (additive, slightly larger, low opacity) = bloom feel
  const ghost=new THREE.Mesh(logo.geometry,new THREE.ShaderMaterial({uniforms:{...U,boost:{value:2.2}},transparent:true,depthWrite:false,blending:add,vertexShader:vert,fragmentShader:frag.replace('gl_FragColor=vec4(col*fl,al*fl)','gl_FragColor=vec4(col*fl*.35,al*fl*.35)')}));
  ghost.scale.setScalar(1.04);ghost.position.z=-.05;root.add(ghost);
  // rings
  const ringG=new THREE.Group();ringG.rotation.x=1.18;root.add(ringG);
  const ringMat=(c1,c2)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:add,uniforms:{t:U.t,c1:{value:new THREE.Color(c1)},c2:{value:new THREE.Color(c2)},o:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t,o;uniform vec3 c1,c2;varying vec2 vUv;void main(){float x=fract(vUv.x-t*.12);float head=pow(x,6.);float core=1.-abs(vUv.y-.5)*2.;
      vec3 c=mix(c1,c2,head);gl_FragColor=vec4(c*(.5+1.6*head),(.35+.65*head)*core*o);}`});
  const mk=(rad,tube,c1,c2)=>new THREE.Mesh(new THREE.TorusGeometry(rad,tube,6,200),ringMat(c1,c2));
  const r1=mk(1.75,.018,0x1a6cff,0x9ff6ff),r2=mk(1.92,.01,0xff6a00,0xffd08a),r3=mk(1.58,.006,0x38e8ff,0xffffff);
  r2.rotation.x=.28;r3.rotation.y=.35;ringG.add(r1,r2,r3);
  const orb=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex([[0,'rgba(255,255,255,1)'],[.15,'rgba(255,170,60,.9)'],[.5,'rgba(255,120,20,.2)'],[1,'rgba(0,0,0,0)']]),blending:add,depthWrite:false}));
  orb.scale.set(.32,.32,1);ringG.add(orb);
  // particles: orbit swarm + dust field, one Points, shader-driven orbits
  const N=mobile?420:1100,pos=new Float32Array(N*3),seed=new Float32Array(N*4),col=new Float32Array(N*3);
  const O=new THREE.Color(0xff8c1a),C=new THREE.Color(0x38e8ff),B=new THREE.Color(0x3b7bff);
  for(let i=0;i<N;i++){const swarm=i<N*.45;seed.set([Math.random()*6.283,swarm?1.6+Math.random()*.55:1.2+Math.random()*3.6,swarm?(Math.random()-.5)*.25:(Math.random()-.5)*5,swarm?1:0],i*4);
    const cc=Math.random();(cc<.22?O:cc<.6?B:C).toArray(col,i*3);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('seed',new THREE.BufferAttribute(seed,4));pg.setAttribute('color',new THREE.BufferAttribute(col,3));
  const PU={t:U.t,px:{value:Math.min(devicePixelRatio,1.5)},o:{value:0}};
  const pts=new THREE.Points(pg,new THREE.ShaderMaterial({uniforms:PU,transparent:true,depthWrite:false,blending:add,vertexColors:true,
    vertexShader:`attribute vec4 seed;uniform float t,px;varying vec3 vC;varying float vA;
      void main(){float sp=seed.w>.5?.35/seed.y:.04;float a=seed.x+t*sp;vec3 p;
       if(seed.w>.5){p=vec3(cos(a)*seed.y,seed.z+sin(a*3.+seed.x)*.05,sin(a)*seed.y);
         p.yz=mat2(cos(1.18),sin(1.18),-sin(1.18),cos(1.18))*p.yz;}
       else{p=vec3(cos(a)*seed.y,seed.z+sin(t*.3+seed.x)*.15,sin(a)*seed.y-1.);}
       vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
       float tw=.55+.45*sin(t*2.+seed.x*20.);gl_PointSize=px*(seed.w>.5?3.2:2.4)*(6./-mv.z)*(.6+tw*.6);
       vC=color;vA=tw*smoothstep(14.,4.,-mv.z);}`,
    fragmentShader:`uniform float o;varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float f=smoothstep(.5,0.,d);gl_FragColor=vec4(vC*(f*f*1.6),f*vA*o);}`}));
  root.add(pts);
  // sizing: keep rings inside viewport on narrow screens
  const resize=()=>{const w=r.domElement.clientWidth||hero.clientWidth,h=r.domElement.clientHeight||hero.clientHeight,asp=w/h;r.setSize(w,h,false);cam.aspect=asp;
    const mob=asp<1,rs=mob?.8:1;ringG.scale.setScalar(rs);pts.scale.setScalar(mob?.85:1);
    cam.position.z=mob?Math.max(5,1.68/(Math.tan(THREE.MathUtils.degToRad(20))*asp)):4.6;
    root.position.y=mob?cam.position.z*.075:0;cam.updateProjectionMatrix();};
  resize();addEventListener('resize',resize);
  // parallax
  let tx=0,ty=0,px=0,py=0,sc=0;
  addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5);ty=(e.clientY/innerHeight-.5);},{passive:true});
  addEventListener('scroll',()=>{sc=Math.min(scrollY/innerHeight,1);if(vis)loop();},{passive:true});
  let vis=true,last=0,t0=performance.now(),tIntro=0,raf=0;
  new IntersectionObserver(([e])=>{vis=e.isIntersecting;if(vis)loop();}).observe(hero);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loop();});
  function loop(now=performance.now()){cancelAnimationFrame(raf);if(!vis||document.hidden)return;raf=requestAnimationFrame(loop);
    if(now-last<1000/30-1)return;last=now;const t=(now-t0)/1000;U.t.value=t;
    const k=tIntro?(now-tIntro)/1000:0;U.intro.value=ease(k/1.4)*1.05;const fade=ease((k-.3)/1.2);
    PU.o.value=fade;r1.material.uniforms.o.value=ease((k-.5)/.9);r2.material.uniforms.o.value=ease((k-.7)/.9);r3.material.uniforms.o.value=ease((k-.9)/.9)*.8;
    halo.material.opacity=fade*(.85+.15*Math.sin(t*1.7));warm.material.opacity=fade*(.7+.3*Math.sin(t*1.1+1));
    px+=(tx-px)*.06;py+=(ty-py)*.06;
    root.rotation.y=px*.35+Math.sin(t*.5)*.08;root.rotation.x=py*.2;
    logo.rotation.y=ghost.rotation.y=Math.sin(t*.55)*.22;logo.position.y=ghost.position.y=Math.sin(t*1.1)*.05;
    pts.rotation.y=-px*.25;
    r1.rotation.z=t*.55;r2.rotation.z=-t*.38;r3.rotation.z=t*.9;
    const oa=t*.9;orb.position.set(Math.cos(oa)*1.75,Math.sin(oa)*1.75,0);
    ringG.rotation.y=Math.sin(t*.33)*.15;
    cam.position.y=-.35-sc*.8;cam.lookAt(0,-sc*.4,0);
    r.render(scene,cam);}
  return true;
}
