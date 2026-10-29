'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { zenAudio } from '@/lib/soundEffects';

interface PhucDucSceneProps {
  currentStep: number;
  isIncenseLit: boolean;
  onLitIncense: () => void;
  onSelectObject?: (name: string) => void;
  reduceMotion?: boolean;
}

// Hàm sinh Texture chữ thư pháp sơn son thếp vàng cho Hoành phi & Câu đối & Bài vị
function createCalligraphyTexture(
  text: string,
  width: number,
  height: number,
  subText?: string,
  isVertical: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Nền đỏ sơn son trầm ấm cổ kính
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#660f0a');
  grad.addColorStop(0.5, '#4a0a07');
  grad.addColorStop(1, '#5c0d09');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Viền hoa văn chỉ vàng
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = Math.max(6, Math.floor(height * 0.03));
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Hiệu ứng chữ vàng thếp vàng phát sáng
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  if (isVertical) {
    // Vẽ chữ dọc cho liễn đối
    const chars = text.split('');
    const charSpacing = (height - 80) / chars.length;
    const fontSize = Math.min(width * 0.45, charSpacing * 0.85);
    ctx.font = `bold ${fontSize}px "Playfair Display", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    chars.forEach((c, i) => {
      ctx.fillText(c, width / 2, 50 + i * charSpacing + charSpacing / 2);
    });
  } else {
    // Vẽ chữ ngang cho hoành phi
    const fontSize = Math.floor(height * 0.45);
    ctx.font = `bold ${fontSize}px "Playfair Display", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, subText ? height * 0.42 : height / 2);

    if (subText) {
      ctx.font = `italic ${Math.floor(height * 0.22)}px "Playfair Display", serif`;
      ctx.fillStyle = '#fef08a';
      ctx.fillText(subText, width / 2, height * 0.78);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function PhucDucScene({
  currentStep,
  isIncenseLit,
  onLitIncense,
  onSelectObject,
  reduceMotion = false,
}: PhucDucSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [hoveredObjectName, setHoveredObjectName] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);
  const incenseSmokeRef = useRef<THREE.Points | null>(null);
  const incenseSparksRef = useRef<THREE.Points | null>(null);
  const flameLightsRef = useRef<THREE.PointLight[]>([]);
  const incenseTipsRef = useRef<THREE.Mesh[]>([]);
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const lanternsRef = useRef<THREE.Group[]>([]);

  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const checkWebGL = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!checkWebGL()) {
      setWebGLSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. SCENE VỚI ÁNH SÁNG NÂU ẤM SÁNG SỦA, TRANG NGHIÊM
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x26160e); // Không gian ấm cúng sáng sủa
    scene.fog = new THREE.FogExp2(0x26160e, 0.009); // Fog nhẹ thanh thoát, không che khuất

    // 2. CAMERA CHUẨN TỈ LỆ THỜ CÚNG (CÂN ĐỐI, THẤY TOÀN CẢNH)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 2.25, 4.8);
    camera.lookAt(0, 2.1, 0);
    cameraRef.current = camera;

    // 3. RENDERER CHẤT LƯỢNG CAO
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    interactiveObjectsRef.current = [];
    flameLightsRef.current = [];
    incenseTipsRef.current = [];
    lanternsRef.current = [];

    // ==========================================
    // 4. HỆ THỐNG ÁNH SÁNG ẤM CÚNG, SÁNG SỦA RÕ NÉT
    // ==========================================
    // Ánh sáng môi trường dịu dàng sáng tỏ
    const ambientLight = new THREE.AmbientLight(0xffeedb, 1.8);
    scene.add(ambientLight);

    // Ánh sáng trần và phản xạ sàn ấm áp
    const hemiLight = new THREE.HemisphereLight(0xfff8e7, 0x5c3219, 1.1);
    scene.add(hemiLight);

    // Đèn rọi bàn thờ chính (Center warm spotlight)
    const centerSpot = new THREE.SpotLight(0xfff1cf, 3.8);
    centerSpot.position.set(0, 4.6, 2.6);
    centerSpot.angle = Math.PI / 4.0;
    centerSpot.penumbra = 0.8;
    centerSpot.castShadow = true;
    scene.add(centerSpot);

    // Đèn rọi hoành phi & khám thờ
    const shrineSpot = new THREE.SpotLight(0xffdf9e, 2.8);
    shrineSpot.position.set(0, 4.0, 1.2);
    shrineSpot.target.position.set(0, 3.1, -1.0);
    scene.add(shrineSpot);
    scene.add(shrineSpot.target);

    // Đôi đèn dầu bập bùng hai bên
    const lampL = new THREE.PointLight(0xffa840, 2.0, 4.5);
    lampL.position.set(-1.4, 2.05, 0.25);
    scene.add(lampL);
    flameLightsRef.current.push(lampL);

    const lampR = new THREE.PointLight(0xffa840, 2.0, 4.5);
    lampR.position.set(1.4, 2.05, 0.25);
    scene.add(lampR);
    flameLightsRef.current.push(lampR);

    // ==========================================
    // 5. VẬT LIỆU CAO CẤP SÁNG BÓNG (GỖ GỤ, ĐỒNG THAU, GỐM SỨ)
    // ==========================================
    const woodMahogany = new THREE.MeshStandardMaterial({
      color: 0x3d170c, // Gỗ gụ nâu bóng sang trọng
      roughness: 0.32,
      metalness: 0.12,
    });
    const woodTrim = new THREE.MeshStandardMaterial({
      color: 0x280e06,
      roughness: 0.45,
    });
    const goldLeaf = new THREE.MeshStandardMaterial({
      color: 0xe2ba3c, // Vàng quỳ 24k rực rỡ
      roughness: 0.22,
      metalness: 0.82,
    });
    const bronzeAncient = new THREE.MeshStandardMaterial({
      color: 0xb8833d, // Đồng thau mắt cua bóng sáng
      roughness: 0.25,
      metalness: 0.85,
    });
    const redVelvet = new THREE.MeshStandardMaterial({
      color: 0x660f0f, // Rèm nhung đỏ hoàng gia
      roughness: 0.78,
      metalness: 0.06,
    });
    const jadePorcelain = new THREE.MeshStandardMaterial({
      color: 0x1f564a, // Men ngọc bích Bát Tràng bóng sáng
      roughness: 0.14,
      metalness: 0.1,
    });

    // ==========================================
    // 6. KIẾN TRÚC GIAN THỜ TRUYỀN THỐNG
    // ==========================================
    // Vách gỗ nâu ấm phía sau
    const wallGeo = new THREE.PlaneGeometry(12, 8);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e170c, roughness: 0.82 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 3.0, -1.15);
    wall.receiveShadow = true;
    scene.add(wall);

    // Lam gỗ trang trí hai bên vách
    for (let x = -3.2; x <= 3.2; x += 0.4) {
      if (Math.abs(x) < 1.6) continue;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 5.0, 0.02), woodTrim);
      slat.position.set(x, 3.0, -1.13);
      scene.add(slat);
    }

    // Rèm lụa nhung đỏ buông hai bên
    const curtainL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.4, 0.06), redVelvet);
    curtainL.position.set(-2.55, 2.7, -0.4);
    scene.add(curtainL);

    const curtainR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.4, 0.06), redVelvet);
    curtainR.position.set(2.55, 2.7, -0.4);
    scene.add(curtainR);

    // Diềm cửa võng chạm mây vàng trên đỉnh
    const archBorder = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 0.08), goldLeaf);
    archBorder.position.set(0, 4.4, -0.4);
    scene.add(archBorder);

    // ==========================================
    // 7. HOÀNH PHI & CÂU ĐỐI VỚI CHỮ THƯ PHÁP SẮC NÉT
    // ==========================================
    // Hoành phi: ĐỨC LƯU QUANG (德流光)
    const hoanhPhiTexture = createCalligraphyTexture('ĐỨC LƯU QUANG', 1024, 256, 'Đức sáng muôn đời');
    const boardMat = new THREE.MeshStandardMaterial({
      map: hoanhPhiTexture,
      roughness: 0.35,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.65, 0.05), boardMat);
    board.position.set(0, 3.48, -1.08);
    scene.add(board);

    // Khung viền mạ vàng cho hoành phi
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.73, 0.04), goldLeaf);
    boardFrame.position.set(0, 3.48, -1.09);
    scene.add(boardFrame);

    // Câu đối bên trái: "Tổ Tông Công Đức Thiên Niên Thịnh"
    const scrollLTex = createCalligraphyTexture('Tổ Tông Công Đức Thiên Niên Thịnh', 256, 1024, undefined, true);
    const scrollLMat = new THREE.MeshStandardMaterial({ map: scrollLTex, roughness: 0.4 });
    const scrollL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.1, 0.04), scrollLMat);
    scrollL.position.set(-1.85, 2.45, -1.08);
    scene.add(scrollL);

    const scrollLBorder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.16, 0.03), goldLeaf);
    scrollLBorder.position.set(-1.85, 2.45, -1.09);
    scene.add(scrollLBorder);

    // Câu đối bên phải: "Tử Hiếu Tôn Hiền Vạn Đại Vinh"
    const scrollRTex = createCalligraphyTexture('Tử Hiếu Tôn Hiền Vạn Đại Vinh', 256, 1024, undefined, true);
    const scrollRMat = new THREE.MeshStandardMaterial({ map: scrollRTex, roughness: 0.4 });
    const scrollR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.1, 0.04), scrollRMat);
    scrollR.position.set(1.85, 2.45, -1.08);
    scene.add(scrollR);

    const scrollRBorder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.16, 0.03), goldLeaf);
    scrollRBorder.position.set(1.85, 2.45, -1.09);
    scene.add(scrollRBorder);

    // ==========================================
    // 8. KHÁM THỜ / NGAI THỜ VÀ BÀI VỊ GIA TIÊN TRUNG TÂM
    // ==========================================
    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(0, 2.35, -0.75);

    // Khung ngai thờ gỗ son
    const shrineBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.78, 0.3), woodMahogany);
    shrineGroup.add(shrineBody);

    // Mái ngai thờ cong vút mạ vàng
    const shrineRoof = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.38), goldLeaf);
    shrineRoof.position.y = 0.44;
    shrineGroup.add(shrineRoof);

    // Bài vị "CỬU HUYỀN THẤT TỔ"
    const tabletTex = createCalligraphyTexture('CỬU HUYỀN THẤT TỔ', 256, 512, undefined, true);
    const tabletMat = new THREE.MeshStandardMaterial({ map: tabletTex, roughness: 0.3 });
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.58, 0.04), tabletMat);
    tablet.position.set(0, 0.15, 0.14);
    shrineGroup.add(tablet);

    scene.add(shrineGroup);

    // ==========================================
    // 9. BÀN THỜ GIA TIÊN GỖ GỤ SANG TRỌNG
    // ==========================================
    // Thượng ban (Bàn tầng trên)
    const upperTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.8), woodMahogany);
    upperTable.position.set(0, 1.62, -0.35);
    upperTable.receiveShadow = true;
    scene.add(upperTable);

    // Hạ ban (Mặt bàn chính rộng rãi)
    const mainTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 1.6), woodMahogany);
    mainTable.position.set(0, 1.35, 0.05);
    mainTable.receiveShadow = true;
    scene.add(mainTable);

    // Yếm bàn thờ viền vàng chữ Vạn trang nghiêm
    const apron = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.24, 1.62), goldLeaf);
    apron.position.set(0, 1.18, 0.05);
    scene.add(apron);

    // Bốn chân bàn gỗ chạm rồng vững chãi
    const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 1.35, 12);
    [
      [-1.68, 0.68, 0.75],
      [1.68, 0.68, 0.75],
      [-1.68, 0.68, -0.65],
      [1.68, 0.68, -0.65],
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodMahogany);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      scene.add(leg);
    });

    // ==========================================
    // 10. ĐÔI ĐÈN LỒNG CUNG ĐÌNH ĐUNG ĐƯA
    // ==========================================
    const createLantern = (xPos: number) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(xPos, 3.4, 0.4);

      // Thân đèn lồng đỏ
      const bodyGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0x991010,
        emissive: 0x550808,
        emissiveIntensity: 0.6,
        roughness: 0.6,
      });
      const body = new THREE.Mesh(bodyGeo, lanternMat);
      body.scale.set(1.1, 0.85, 1.1);
      lanternGroup.add(body);

      // Đai vàng
      const ringTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), goldLeaf);
      ringTop.position.y = 0.16;
      lanternGroup.add(ringTop);

      const ringBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), goldLeaf);
      ringBottom.position.y = -0.16;
      lanternGroup.add(ringBottom);

      // Tua rua vàng
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.35, 8), goldLeaf);
      tassel.position.y = -0.38;
      lanternGroup.add(tassel);

      scene.add(lanternGroup);
      lanternsRef.current.push(lanternGroup);
    };

    createLantern(-2.0);
    createLantern(2.0);

    // ==========================================
    // 11. BÁT HƯƠNG ĐỒNG, ĐÔI ĐÈN DẦU, BÌNH HOA & MÂM QUẢ
    // ==========================================

    // A. BÁT HƯƠNG ĐỒNG CỔ (TRUNG TÂM - NHẤN ĐỂ DÂNG HƯƠNG)
    const incenseGroup = new THREE.Group();
    incenseGroup.position.set(0, 1.7, 0.15);
    incenseGroup.name = 'bathuong';

    const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 24), bronzeAncient);
    incenseGroup.add(burnerBase);

    const burnerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.24, 28), bronzeAncient);
    burnerBody.position.y = 0.14;
    burnerBody.castShadow = true;
    incenseGroup.add(burnerBody);

    // Tai rồng uốn lượn hai bên
    const earGeo = new THREE.TorusGeometry(0.08, 0.022, 8, 16);
    const earL = new THREE.Mesh(earGeo, bronzeAncient);
    earL.position.set(-0.28, 0.16, 0);
    earL.rotation.y = Math.PI / 2;
    incenseGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, bronzeAncient);
    earR.position.set(0.28, 0.16, 0);
    earR.rotation.y = Math.PI / 2;
    incenseGroup.add(earR);

    // Tro hương rơm nếp
    const ash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24),
      new THREE.MeshStandardMaterial({ color: 0x9c9388, roughness: 0.95 })
    );
    ash.position.set(0, 0.24, 0);
    incenseGroup.add(ash);

    // 3 Nén hương thơm
    const stickGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.45, 8);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8a4b27, roughness: 0.85 });

    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: isIncenseLit ? 0xff4400 : 0x000000,
      emissiveIntensity: isIncenseLit ? 4.0 : 0.0,
      roughness: 0.1,
    });
    const tipGeo = new THREE.SphereGeometry(0.015, 8, 8);

    const stickOffsets = [
      [0, 0.42, 0],
      [-0.055, 0.4, -0.02],
      [0.055, 0.4, -0.02],
    ];

    stickOffsets.forEach(([sx, sy, sz]) => {
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(sx, sy, sz);
      incenseGroup.add(stick);

      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(sx, sy + 0.22, sz);
      incenseGroup.add(tip);
      incenseTipsRef.current.push(tip);
    });

    scene.add(incenseGroup);
    interactiveObjectsRef.current.push(burnerBody);

    // B. ĐÔI ĐÈN DẦU HOA SEN ĐỒNG (ÁNH LỬA BẬP BÙNG)
    const createOilLamp = (xPos: number, name: string) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(xPos, 1.45, 0.25);
      lampGroup.name = name;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.06, 16), bronzeAncient);
      lampGroup.add(base);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.35, 12), bronzeAncient);
      stem.position.y = 0.2;
      lampGroup.add(stem);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.08, 16), goldLeaf);
      bowl.position.y = 0.4;
      lampGroup.add(bowl);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.11, 8),
        new THREE.MeshBasicMaterial({ color: 0xffefb8 })
      );
      flame.position.y = 0.49;
      lampGroup.add(flame);

      scene.add(lampGroup);
      interactiveObjectsRef.current.push(base);
    };

    createOilLamp(-1.4, 'dendau_trai');
    createOilLamp(1.4, 'dendau_phai');

    // C. BÌNH HOA SEN BÁT TRÀNG (BÊN TRÁI)
    const vaseGroup = new THREE.Group();
    vaseGroup.position.set(-0.92, 1.45, -0.05);
    vaseGroup.name = 'binhhoa';

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.52, 16), jadePorcelain);
    vase.position.y = 0.26;
    vase.castShadow = true;
    vaseGroup.add(vase);

    // Hoa sen hồng nở thanh tao
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.35 });
    for (let i = 0; i < 3; i++) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8), lotusMat);
      lotus.position.set((i - 1) * 0.06, 0.62 + (i % 2) * 0.06, (i - 1) * 0.04);
      lotus.rotation.z = (i - 1) * 0.15;
      vaseGroup.add(lotus);
    }
    scene.add(vaseGroup);
    interactiveObjectsRef.current.push(vase);

    // D. MÂM NGŨ QUẢ CẦU AN (BÊN PHẢI)
    const fruitGroup = new THREE.Group();
    fruitGroup.position.set(0.92, 1.45, -0.05);
    fruitGroup.name = 'mamnguqua';

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.16, 0.08, 20), goldLeaf);
    plate.position.y = 0.04;
    fruitGroup.add(plate);

    const pomelo = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.5 })
    );
    pomelo.position.set(0, 0.2, 0);
    fruitGroup.add(pomelo);

    const fruitRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
    );
    fruitRed.position.set(0.13, 0.14, 0.07);
    fruitGroup.add(fruitRed);

    const fruitOrange = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
    );
    fruitOrange.position.set(-0.13, 0.14, 0.07);
    fruitGroup.add(fruitOrange);

    scene.add(fruitGroup);
    interactiveObjectsRef.current.push(plate);

    // E. CUỐN SỚ HỒNG ĐIỀU ĐẶT TRÊN BÀN THỜ
    const scrollGroup = new THREE.Group();
    scrollGroup.position.set(0.48, 1.45, 0.45);
    scrollGroup.name = 'cuonso';

    const scrollRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.4 })
    );
    scrollRoll.rotation.z = Math.PI / 2;
    scrollGroup.add(scrollRoll);

    const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), goldLeaf);
    knobL.position.x = -0.18;
    scrollGroup.add(knobL);

    const knobR = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), goldLeaf);
    knobR.position.x = 0.18;
    scrollGroup.add(knobR);

    scene.add(scrollGroup);
    interactiveObjectsRef.current.push(scrollRoll);

    // ==========================================
    // 12. HẠT BỤI VÀNG & KHÓI HƯƠNG 3D
    // ==========================================
    const dustCount = reduceMotion ? 40 : 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 5.0;
      dustPositions[i * 3 + 1] = 1.0 + Math.random() * 3.2;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.03,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // Hạt khói hương uốn lượn bay lên
    const smokeCount = reduceMotion ? 35 : 100;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] = (Math.random() - 0.5) * 0.05;
      smokePositions[i * 3 + 1] = 2.18 + Math.random() * 1.0;
      smokePositions[i * 3 + 2] = 0.15 + (Math.random() - 0.5) * 0.05;
      smokeVelocities.push({
        x: (Math.random() - 0.5) * 0.0025,
        y: 0.006 + Math.random() * 0.008,
        z: (Math.random() - 0.5) * 0.0025,
      });
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xd6d3d1,
      size: 0.075,
      transparent: true,
      opacity: isIncenseLit ? 0.45 : 0.0,
      blending: THREE.NormalBlending,
    });
    const incenseSmoke = new THREE.Points(smokeGeo, smokeMat);
    scene.add(incenseSmoke);
    incenseSmokeRef.current = incenseSmoke;

    // ==========================================
    // 13. ANIMATION VỚI MOUSE PARALLAX MƯỢT MÀ
    // ==========================================
    const startTime = performance.now();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) / 1000;

      // Đèn dầu bập bùng tự nhiên
      flameLightsRef.current.forEach((light, idx) => {
        const flicker = Math.sin(elapsedTime * 6 + idx * 2.5) * 0.2 + Math.cos(elapsedTime * 9 + idx) * 0.1;
        light.intensity = 1.8 + flicker;
      });

      // Đèn lồng đung đưa
      lanternsRef.current.forEach((lantern, idx) => {
        lantern.rotation.z = Math.sin(elapsedTime * 1.4 + idx) * 0.035;
      });

      // Bụi sáng vàng trôi lờ lững
      if (!reduceMotion && dustGeo.attributes.position) {
        const positions = dustGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          positions[i * 3 + 1] += Math.sin(elapsedTime + i) * 0.001;
          positions[i * 3] += Math.cos(elapsedTime * 0.5 + i) * 0.0008;
        }
        dustGeo.attributes.position.needsUpdate = true;
      }

      // Khói hương bay uốn lượn
      if (isIncenseLit && smokeGeo.attributes.position) {
        const smokeArr = smokeGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < smokeCount; i++) {
          smokeArr[i * 3 + 1] += smokeVelocities[i].y;
          smokeArr[i * 3] += Math.sin(elapsedTime * 2.0 + smokeArr[i * 3 + 1] * 4.0) * 0.002 + smokeVelocities[i].x;

          if (smokeArr[i * 3 + 1] > 3.6) {
            smokeArr[i * 3] = (Math.random() - 0.5) * 0.04;
            smokeArr[i * 3 + 1] = 2.18;
            smokeArr[i * 3 + 2] = 0.15 + (Math.random() - 0.5) * 0.04;
          }
        }
        smokeGeo.attributes.position.needsUpdate = true;
      }

      // Camera parallax theo chuột mượt mà
      if (!reduceMotion) {
        const targetCamX = mouseTargetRef.current.x * 0.35;
        const targetCamY = 2.25 + mouseTargetRef.current.y * 0.18;

        camera.position.x += (targetCamX - camera.position.x) * 0.04;
        camera.position.y += (targetCamY - camera.position.y) * 0.04;
        camera.lookAt(0, 2.1, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ==========================================
    // 14. SỰ KIỆN TƯƠNG TÁC CHUỘT
    // ==========================================
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      mouse.x = normX;
      mouse.y = normY;
      mouseTargetRef.current = { x: normX, y: normY };

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let parentName = '';
        let currentObj: THREE.Object3D | null = intersects[0].object;
        while (currentObj && !parentName) {
          if (currentObj.name) parentName = currentObj.name;
          currentObj = currentObj.parent;
        }
        setHoveredObjectName(parentName || 'vật phẩm');
        container.style.cursor = 'pointer';
      } else {
        setHoveredObjectName(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let parentName = '';
        let currentObj: THREE.Object3D | null = intersects[0].object;
        while (currentObj && !parentName) {
          if (currentObj.name) parentName = currentObj.name;
          currentObj = currentObj.parent;
        }

        if (parentName === 'bathuong') {
          zenAudio.playIgniteSound();
          zenAudio.playSingingBowl(380);
          onLitIncense();
        } else if (parentName === 'cuonso') {
          zenAudio.playScrollUnrollSound();
          if (onSelectObject) onSelectObject('cuonso');
        } else {
          zenAudio.playWoodenBlock();
          if (onSelectObject && parentName) onSelectObject(parentName);
        }
      }
    };

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [checkWebGL, reduceMotion]);

  // Cập nhật trạng thái đầu hương khi thắp
  useEffect(() => {
    if (incenseTipsRef.current.length > 0) {
      incenseTipsRef.current.forEach((tip) => {
        const mat = tip.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isIncenseLit ? 0xff4400 : 0x000000);
        mat.emissiveIntensity = isIncenseLit ? 4.0 : 0.0;
        mat.needsUpdate = true;
      });
    }

    if (incenseSmokeRef.current) {
      const mat = incenseSmokeRef.current.material as THREE.PointsMaterial;
      mat.opacity = isIncenseLit ? 0.45 : 0.0;
      mat.needsUpdate = true;
    }
  }, [isIncenseLit]);

  // Điều chỉnh camera nhẹ nhàng theo bước
  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    if (currentStep === 1) {
      cam.position.set(0, 2.25, 4.8);
    } else if (currentStep === 2) {
      cam.position.set(0, 2.1, 4.0); // Tiến gần để dâng hương
    } else if (currentStep >= 3) {
      cam.position.set(0, 2.25, 4.8);
    }
  }, [currentStep]);

  if (!webGLSupported) {
    return (
      <div className="w-full h-full relative flex items-center justify-center bg-stone-950 text-amber-100 p-6 overflow-hidden select-none">
        <div className="relative z-10 text-center max-w-lg space-y-4">
          <div className="w-32 h-32 mx-auto flex items-center justify-center rounded-full bg-amber-950/40 border border-amber-500/40">
            <span className="text-5xl">🕯️</span>
          </div>
          <h3 className="text-xl font-bold font-serif text-amber-200">
            Gian Thờ Gia Tiên &ndash; Phúc Đức Trường Tồn
          </h3>
          {!isIncenseLit && currentStep === 2 && (
            <button
              onClick={() => {
                onLitIncense();
                zenAudio.playSingingBowl(380);
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm"
            >
              Thắp 3 nén tâm hương
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full absolute inset-0" />

      {/* Gợi ý tương tác hover trên vật phẩm */}
      {hoveredObjectName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20 transition-all duration-200">
          <div className="bg-stone-950/90 backdrop-blur-md border border-amber-500/60 px-4 py-1.5 rounded-full text-amber-200 text-xs font-semibold shadow-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            {hoveredObjectName === 'bathuong' && 'Bát Hương Đồng Cổ (Nhấn để dâng hương)'}
            {hoveredObjectName === 'cuonso' && 'Sớ Cầu Nguyện Thi Cử (Nhấn để mở sớ)'}
            {hoveredObjectName === 'mamnguqua' && 'Mâm Ngũ Quả Phúc Lộc'}
            {hoveredObjectName === 'binhhoa' && 'Bình Hoa Sen Bát Tràng'}
            {hoveredObjectName.startsWith('dendau') && 'Đèn Dầu Ánh Sáng Trí Tuệ'}
          </div>
        </div>
      )}
    </div>
  );
}
