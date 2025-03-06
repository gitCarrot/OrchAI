'use client';

import { useEffect } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChefHat, Refrigerator, Share2, Sparkles, Users, Check, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

// 섹션 컴포넌트
const Section = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className = '' }, ref) => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
    const controls = useAnimation();

    useEffect(() => {
      if (isInView) {
        controls.start('visible');
      }
    }, [isInView, controls]);

    return (
      <motion.div
        ref={(node) => {
          // 두 ref를 모두 할당
          sectionRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        initial="hidden"
        animate={controls}
        variants={{
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
        }}
        className={`py-20 relative z-10 ${className}`}
      >
        {children}
      </motion.div>
    );
  }
);

Section.displayName = 'Section';

// 특징 카드 컴포넌트
const FeatureCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 relative z-10"
  >
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="p-3 bg-primary/10 rounded-full">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </motion.div>
);

const ChatMessage = ({ isAI = false, children, delay = 0 }: { isAI?: boolean; children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, x: isAI ? 20 : -20 }}
    whileInView={{ opacity: 1, y: 0, x: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    className={`${
      isAI ? 'bg-primary/10 md:ml-auto' : 'bg-background/80'
    } p-4 rounded-lg md:max-w-[80%] shadow-sm mb-6`}
  >
    {children}
  </motion.div>
);

const ActionCard = ({ title, status, onClick, delay = 0 }: { 
  title: string; 
  status: 'pending' | 'success' | 'error'; 
  onClick?: () => void;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.02 }}
    className={`
      p-4 rounded-lg shadow-sm cursor-pointer mb-4
      ${status === 'pending' ? 'bg-orange-100/10 border border-orange-200' : ''}
      ${status === 'success' ? 'bg-green-100/10 border border-green-200' : ''}
      ${status === 'error' ? 'bg-red-100/10 border border-red-200' : ''}
    `}
  >
    <div className="flex items-center justify-between">
      <span>{title}</span>
      {status === 'pending' && <ArrowRight className="w-4 h-4 text-orange-500" />}
      {status === 'success' && <Check className="w-4 h-4 text-green-500" />}
      {status === 'error' && <X className="w-4 h-4 text-red-500" />}
    </div>
  </motion.div>
);

const ChatContainer = ({ title, children }: { title: string; children: React.ReactNode }) => {
  // 자식 요소들에게 순차적으로 딜레이를 추가하는 함수
  const addDelayToChildren = (children: React.ReactNode) => {
    let index = 0;
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        index++;
        // div인 경우 내부 자식들도 처리
        if (child.type === 'div') {
          return React.cloneElement(child, {
            children: React.Children.map(child.props.children, (innerChild) => {
              if (React.isValidElement(innerChild)) {
                index++;
                return React.cloneElement(innerChild, {
                  delay: index * 0.2,
                  ...innerChild.props
                });
              }
              return innerChild;
            })
          });
        }
        // 일반 컴포넌트인 경우
        return React.cloneElement(child, {
          delay: index * 0.2,
          ...child.props
        });
      }
      return child;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-2xl md:h-[600px]"
    >
      <div className="absolute inset-0 bg-white/5 rounded-2xl backdrop-blur-sm" />
      <div className="relative space-y-4 md:h-full">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 md:sticky md:top-0 bg-background/80 p-2 rounded-lg backdrop-blur-sm z-10">
          <Users className="w-4 h-4" />
          {title}
        </div>
        <div className="md:h-[calc(100%-4rem)] md:overflow-y-auto md:[&::-webkit-scrollbar]:w-2 md:[&::-webkit-scrollbar-track]:bg-transparent md:[&::-webkit-scrollbar-thumb]:bg-primary/10 md:[&::-webkit-scrollbar-thumb]:rounded-full md:hover:[&::-webkit-scrollbar-thumb]:bg-primary/20 md:[&::-webkit-scrollbar]:hidden md:hover:[&::-webkit-scrollbar]:block px-2">
          {addDelayToChildren(children)}
        </div>
        <div className="hidden md:flex items-center justify-center absolute bottom-4 left-0 right-0 pointer-events-none">
          <motion.div
            initial={{ opacity: 0.5, y: -5 }}
            animate={{ opacity: [0.5, 1, 0.5], y: [-5, 0, -5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="bg-background/80 p-2 rounded-full backdrop-blur-sm"
          >
            <ChevronDown className="w-4 h-4 text-primary" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// 떠다니는 이모티콘 컴포넌트
const FloatingEmoji = ({ emoji, index }: { emoji: string; index: number }) => {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [animation, setAnimation] = React.useState({
    delay: 0,
    duration: 20
  });

  useEffect(() => {
    const x = (Math.random() * 200 - 100);
    const y = (Math.random() * 200 - 100);
    const delay = Math.random() * 10;
    const duration = 20 + Math.random() * 20;

    setPosition({ x, y });
    setAnimation({ delay, duration });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{
        opacity: [0.4, 0.7, 0.7, 0.4],
        x: [0, position.x, -position.x, 0],
        y: [0, position.y, -position.y, 0],
        scale: [0.9, 1.3, 1.3, 0.9],
        rotate: [0, 180, -180, 0],
      }}
      transition={{
        duration: animation.duration,
        delay: animation.delay,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        position: 'fixed',
        left: `${(index % 4) * 25}%`,
        top: `${Math.floor(index / 4) * 25}%`,
        zIndex: 1,
        fontSize: '3.5rem',
        pointerEvents: 'none',
        userSelect: 'none',
        filter: index % 2 === 0 ? 'blur(1px)' : 'blur(2px)',
      }}
    >
      {emoji}
    </motion.div>
  );
};

// 배경 이모티콘 컨테이너
const FloatingEmojiBackground = () => {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const emojis = [
    '🥘', '🍲', '🥗', '🥪', '🌮',
    '🥩', '🍗', '🥕', '🥬', '🍅',
    '🧅', '🥔', '🍠', '🥦', '🥑',
    '🍳', '🧂', '🥢', '🥄', '🍚'
  ];

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none">
      {emojis.map((emoji, index) => (
        <FloatingEmoji key={index} emoji={emoji} index={index} />
      ))}
    </div>
  );
};

export default function Home() {
  const scenarioRef = useRef<HTMLDivElement>(null);

  const scrollToScenario = () => {
    if (scenarioRef.current) {
      const yOffset = -100; // 헤더나 다른 요소를 고려한 오프셋
      const element = scenarioRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <FloatingEmojiBackground />
      {/* 히어로 섹션 */}
      <Section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-primary/5 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent" />
        <div className="container px-4 mx-auto">
          <div className="text-center space-y-8 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
            >
              HIRecipi
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
            >
              냉장고 속 재료로 만드는 특별한 레시피
              <br />
              AI와 함께하는 스마트한 식재료 관리
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex justify-center gap-4"
            >
              <Link href="/refrigerators" className="relative z-10">
                <Button size="lg" className="group">
                  시작하기
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="relative z-10 group"
                onClick={scrollToScenario}
              >
                AI 기능 구경하기
                <Sparkles className="ml-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* 주요 기능 섹션 */}
      <Section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="absolute inset-0">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
          <div className="h-full w-px absolute left-1/2 -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        </div>
        <div className="container px-4 mx-auto relative">
          <div className="text-center space-y-4 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block p-2 bg-primary/10 rounded-lg mb-4">
                <Refrigerator className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                스마트한 식재료 관리의 시작
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
                HIRecipi와 함께라면 주방 생활이 더욱 스마트해집니다
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Refrigerator}
              title="스마트 냉장고 관리"
              description="여러 개의 냉장고를 효율적으로 관리하고, 식재료 유통기한을 체계적으로 추적하세요."
            />
            <FeatureCard
              icon={ChefHat}
              title="AI 레시피 추천"
              description="보유한 재료를 기반으로 AI가 맞춤형 레시피를 추천해드립니다."
            />
            <FeatureCard
              icon={Share2}
              title="레시피 공유"
              description="나만의 레시피를 다른 사용자들과 공유하고 의견을 나눠보세요."
            />
          </div>
        </div>
      </Section>

      {/* AI 기능 소개 섹션 */}
      <Section ref={scenarioRef} className="relative">
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.03]" />
        <div className="container px-4 mx-auto relative">
          <div className="flex flex-col gap-12">
            <div className="text-center space-y-4">
              <div className="inline-block p-2 bg-primary/10 rounded-lg mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                AI와 함께하는 스마트한 요리 경험
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                HIRecipi의 AI는 단순한 레시피 추천을 넘어, 여러분의 요리 여정을 함께합니다.
                아래 예시를 통해 AI와의 다양한 상호작용을 확인해보세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* 냉장고 관리 시나리오 */}
              <ChatContainer title="냉장고 관리 시나리오">
                <ChatMessage>
                  메인 냉장고 추가해주고, 채소, 과일, 육류, 생선, 음료, 술 카테고리 생성후에 카테고리에 알맞는 재료들 너가 알아서 수량 정해서 추천해줘
                </ChatMessage>
                
                <ChatMessage isAI>
                  네, 도와드리겠습니다. 먼저 메인 냉장고를 추가하고, 카테고리를 생성한 후 적절한 재료들을 추천해드리겠습니다.
                </ChatMessage>

                <div className="space-y-2 mb-6">
                  <ActionCard 
                    title="메인 냉장고 추가하기" 
                    status="success"
                  />
                  <ActionCard 
                    title="카테고리 일괄 생성" 
                    status="success"
                  />
                </div>

                <ChatMessage isAI>
                  냉장고와 카테고리가 성공적으로 생성되었습니다. 각 카테고리별 추천 재료입니다:

                  🥬 채소: 양파(3개), 당근(4개), 감자(5개), 대파(2단)
                  🍎 과일: 사과(6개), 바나나(3개), 오렌지(4개)
                  🥩 육류: 삼겹살(500g), 닭가슴살(400g)
                  🐟 생선: 고등어(2마리), 연어(300g)
                  🥤 음료: 콜라(2L), 오렌지주스(1L)
                  🍺 술: 맥주(500ml x 6), 소주(360ml x 2)

                  추천된 재료들을 각 카테고리에 추가하시겠습니까?
                </ChatMessage>

                <ChatMessage>
                  ㅇㅇ 추가해줘!
                </ChatMessage>

                <ChatMessage isAI>
                  네, 각 카테고리별로 재료를 추가하겠습니다.
                </ChatMessage>

                <div className="space-y-2 mb-6">
                  <ActionCard 
                    title="채소 카테고리 재료 추가 중..." 
                    status="success"
                  />
                  <ActionCard 
                    title="과일 카테고리 재료 추가 중..." 
                    status="success"
                  />
                  <ActionCard 
                    title="육류 카테고리 재료 추가 중..." 
                    status="success"
                  />
                  <ActionCard 
                    title="생선 카테고리 재료 추가 중..." 
                    status="success"
                  />
                  <ActionCard 
                    title="음료 카테고리 재료 추가 중..." 
                    status="success"
                  />
                  <ActionCard 
                    title="술 카테고리 재료 추가 중..." 
                    status="success"
                  />
                </div>

                <ChatMessage isAI>
                  모든 재료가 성공적으로 추가되었습니다! 
                  각 카테고리별 재료 현황을 앱에서 확인하실 수 있습니다.
                </ChatMessage>

                <ChatMessage>
                  현재 부재료 냉장고에 채소, 양념, 소스 카테고리를 추가해주고 모든 언어로 볼 수 있게 지원해줘
                </ChatMessage>

                <div className="space-y-2 mb-6">
                  <ActionCard 
                    title="부재료 냉장고 카테고리 추가" 
                    status="success"
                  />
                  <ActionCard 
                    title="다국어 지원 설정" 
                    status="success"
                  />
                </div>

                <ChatMessage isAI>
                  카테고리가 추가되었으며, 다음 언어들로 확인하실 수 있습니다:

                  🇰🇷 한국어:
                  - 채소 / 양념 / 소스

                  🇺🇸 English:
                  - Vegetables / Seasonings / Sauces

                  🇯🇵 日本語:
                  - 野菜 / 薬味 / ソース

                  🇨🇳 中文:
                  - 蔬菜 / 调味料 / 酱料
                </ChatMessage>
              </ChatContainer>

              {/* 레시피 관리 시나리오 */}
              <ChatContainer title="레시피 관리 시나리오">
                <ChatMessage>
                  현재 내가 가지고 있는 레시피중 한식 레시피 다 즐겨찾기 해주고 공유된 레시피 중에서 중식 레시피 3개만 골라서 즐겨찾기해줘
                </ChatMessage>

                <ChatMessage isAI>
                  네, 레시피 즐겨찾기를 도와드리겠습니다.
                </ChatMessage>

                <div className="space-y-2 mb-6">
                  <ActionCard 
                    title="한식 레시피 전체 즐겨찾기 추가" 
                    status="success"
                  />
                  <ActionCard 
                    title="중식 레시피 3개 선택 및 즐겨찾기" 
                    status="success"
                  />
                </div>

                <ChatMessage isAI>
                  즐겨찾기가 완료되었습니다:

                  ✅ 한식 레시피 (12개) 즐겨찾기 추가
                  ✅ 중식 레시피 3개 추가:
                     - 마파두부
                     - 깐풍기
                     - 탕수육
                </ChatMessage>

                <ChatMessage>
                  현재 가지고 있는 레시피를 일본어로 바꿔줘
                </ChatMessage>

                <div className="space-y-2 mb-6">
                  <ActionCard 
                    title="레시피 일본어 번역 시작" 
                    status="success"
                  />
                </div>

                <ChatMessage isAI>
                  레시피가 일본어로 번역되었습니다. 예시:

                  🇰🇷 김치찌개
                  ↓
                  🇯🇵 キムチチゲ
                  
                  [材料]
                  - 豚バラ肉 200g
                  - キムチ 300g
                  - 玉ねぎ 1個
                  - 長ねぎ 1本
                  - 調味料適量

                  [作り方]
                  1. 豚バラ肉を適当な大きさに切ります
                  2. 鍋に豚肉を入れて炒めます
                  ...

                  모든 레시피가 성공적으로 번역되었습니다! 
                  앱에서 언어 설정을 일본어로 변경하시면 
                  전체 레시피를 일본어로 확인하실 수 있습니다.
                </ChatMessage>
              </ChatContainer>

              {/* 레시피 추천 시나리오 */}
              <ChatContainer title="레시피 추천 시나리오">
                <ChatMessage>
                  오늘 저녁 메뉴 추천해줘. 재료는 냉장고에 있는 걸로!
                </ChatMessage>

                <ChatMessage isAI>
                  현재 냉장고 재료를 분석해보니 다음 메뉴들을 추천드립니다:

                  1. 삼겹살 김치찌개 
                     - 재료: 삼겹살, 양파, 대파
                  2. 고등어 조림
                     - 재료: 고등어, 감자, 당근
                  3. 닭가슴살 샐러드
                     - 재료: 닭가슴살, 각종 채소

                  어떤 메뉴가 마음에 드시나요?
                </ChatMessage>

                <ChatMessage>
                  김치찌개 레시피 자세히 알려줘!
                </ChatMessage>

                <ChatMessage isAI>
                  삼겹살 김치찌개 레시피를 알려드리겠습니다:

                  [필요한 재료]
                  - 삼겹살 200g
                  - 김치 300g
                  - 양파 1개
                  - 대파 1대
                  - 고춧가루, 간장, 소금 약간

                  [조리 순서]
                  1. 삼겹살을 적당한 크기로 썰어주세요
                  2. 냄비에 삼겹살을 넣고 중간 불에서 볶아주세요
                  3. 고기가 익으면 김치를 넣고 함께 볶아주세요
                  4. 물을 넣고 끓여주세요
                  5. 양파와 대파를 넣고 간을 맞춰주세요
                  6. 끓인 후 마지막으로 고춧가루를 넣어 마무리해주세요

                  [조리 팁]
                  - 김치는 충분히 익은 것을 사용하면 더 깊은 맛이 납니다
                  - 마지막에 청양고추를 넣으면 칼칼한 맛을 즐길 수 있습니다
                </ChatMessage>

                <ChatMessage>
                  지금 현재 계란, 파, 양파, 간장, 설탕이 있는데 만들 수 있는 간단한 한국식 레시피 3개를 생성해줘
                </ChatMessage>

                <ChatMessage isAI>
                  네, 현재 재료로 만들 수 있는 레시피를 생성하겠습니다.
                </ChatMessage>

                <div className="space-y-2 mb-6">
                  <ActionCard 
                    title="재료 기반 레시피 생성 시작" 
                    status="success"
                  />
                  <ActionCard 
                    title="레시피 상세 정보 추가" 
                    status="success"
                  />
                </div>

                <ChatMessage isAI>
                  레시피가 생성되었습니다:

                  1. 계란파전 🍳
                     - 계란을 풀어 파와 양파를 섞어 부치면 됩니다
                     - 간장, 설탕으로 간단한 소스를 만들어 곁들이세요

                  2. 간장계란밥 🍚
                     - 따끈한 밥 위에 계란프라이를 올리고
                     - 간장과 설탕을 1:0.5 비율로 섞어 뿌려주세요
                     - 송송 썬 파를 고명으로 올려주세요

                  3. 양파달걀국 🥣
                     - 양파를 채 썰어 물에 끓이다가
                     - 계란을 풀어넣고, 파를 송송 썰어 넣으세요
                     - 간장으로 간을 하고 마무리

                  생성된 레시피를 저장하시겠습니까?
                </ChatMessage>
              </ChatContainer>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA 섹션 */}
      <Section className="bg-gradient-to-b from-background via-primary/80 to-primary relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] mix-blend-overlay" />
        <div className="container px-4 mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-lg mb-8 text-primary-foreground/80">
            더 스마트하고 효율적인 주방 생활이 여러분을 기다립니다
          </p>
          <Link href="/refrigerators">
            <Button size="lg" variant="secondary" className="group">
              무료로 시작하기
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </Section>

      <style jsx global>{`
        .bg-grid-pattern {
          background-size: 30px 30px;
          background-image: 
            linear-gradient(to right, rgba(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--primary) / 0.1) 1px, transparent 1px);
        }
        .bg-dot-pattern {
          background-size: 20px 20px;
          background-image: radial-gradient(
            circle at center,
            rgba(var(--primary) / 0.2) 1px,
            transparent 1px
          );
        }
      `}</style>
    </div>
  );
} 