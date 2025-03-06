from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
import uuid
from .conversation_runner import run_conversation
from .graph_definition import build_graph
from langgraph.checkpoint.memory import MemorySaver
import logging

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 초기화
app = FastAPI(title="HIRecipi AI Backend")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 운영 환경에서는 구체적인 origin을 지정해야 합니다
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM 초기화
llm = ChatOpenAI(
    model_name="gpt-4o-mini",
    temperature=0.7,
)

# 그래프 초기화
builder = build_graph()

# 메모리 세이버 초기화
memory = MemorySaver()

# 민감한 도구들의 노드 이름 목록
sensitive_nodes = [
    "recipe_sensitive_tools",
    "refrigerator_sensitive_tools",
]

# 그래프 컴파일
graph = builder.compile(
    checkpointer=memory,
    interrupt_before=sensitive_nodes
)
printed_ids = set()

# 요청 모델
class PageContext(BaseModel):
    page: str
    refrigeratorId: Optional[int] = None
    recipeId: Optional[int] = None
    categoryId: Optional[str] = None
    timestamp: int

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    type: str  # 'message', 'tool_approval', 'error' 중 하나
    content: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None
    message: Optional[str] = None
    responses: Optional[List[Dict[str, Any]]] = None
    complete: Optional[bool] = None
    thread_id: Optional[str] = None

# 레시피 포맷팅 요청/응답 모델
class RecipeFormatRequest(BaseModel):
    recipe: str

class RecipeFormatResponse(BaseModel):
    formatted_recipe: str

# 레시피 번역 요청/응답 모델
class RecipeTranslateRequest(BaseModel):
    recipe: str
    title: str = ""  # 선택적 필드로 변경, 기본값은 빈 문자열
    target_language: str  # 'en', 'ja', 'ko' 등

class RecipeTranslateResponse(BaseModel):
    translated_recipe: str
    translated_title: str

# 레시피 생성 요청/응답 모델
class RecipeGenerateRequest(BaseModel):
    content: str

class RecipeGenerateResponse(BaseModel):
    title: str
    content: str

def parse_recipe_content(content: str) -> dict:
    """GPT 응답에서 제목, 설명, 내용을 추출합니다."""
    lines = content.split('\n')
    title = ""
    description = ""
    content_lines = []
    
    # 제목과 설명 추출
    for line in lines:
        if line.startswith('# '):
            title = line.replace('# ', '').strip()
        elif not line.startswith('#') and not title and line.strip():
            title = line.strip()
        elif title and not description and line.strip():
            description = line.strip()
        else:
            content_lines.append(line)
    
    return {
        "title": title,
        "description": description,
        "content": '\n'.join(content_lines).strip()
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """채팅 요청을 처리하는 엔드포인트"""
    try:
        # context가 None이면 빈 딕셔너리로 초기화
        context = request.context or {}
        
        # userId는 그대로 유지 (변환하지 않음)

        # thread_id가 없으면 새로 생성
        thread_id = request.thread_id or str(uuid.uuid4())
        config = {
            "configurable": {
                "thread_id": thread_id,
                "user_id": context.get("userId", "None"),  # get 메서드로 안전하게 가져오기
                "page": context.get("page", "None"),
                "refrigerator_id": context.get("refrigeratorId", "None"),
                "recipe_id": context.get("recipeId", "None"),
                "category_id": context.get("categoryId", "None"),
                "user_language": context.get("userLanguage", "en")  # 사용자 언어 설정 추가, 기본값은 한국어
            }
        }
        
        # 대화 처리
        result = run_conversation(
            graph=graph,
            message=request.message,
            context=context,
            config=config,
            printed_ids=printed_ids
        )
        
        # thread_id 추가
        if isinstance(result, dict):
            result["thread_id"] = thread_id
            
        return ChatResponse(**result)
            
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"채팅 처리 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/api/recipe/format")
async def format_recipe(request: RecipeFormatRequest) -> RecipeFormatResponse:
    """레시피를 깔끔한 마크다운 형식으로 변환합니다."""
    
    system_prompt = """You are a helpful AI assistant that formats recipes in a clear and organized way.

    Please convert the recipe into the following format:

    # Recipe Title

    ## Ingredients
    - Ingredient 1
    - Ingredient 2
    ...

    ## Instructions
    1. First step
    2. Second step
    ...

    ## Cooking Tips
    - Tip 1
    - Tip 2
    ...

    Please maintain all information from the input recipe while organizing it into the above format.
    Keep it concise and remove any unnecessary explanations or repetitions.
    Also, maintain the original language of the input recipe."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.recipe)
    ]
    
    response = llm.invoke(messages)
    
    return RecipeFormatResponse(
        formatted_recipe=response.content
    )

@app.post("/api/recipe/translate")
async def translate_recipe(request: RecipeTranslateRequest) -> RecipeTranslateResponse:
    """레시피와 제목을 지정된 언어로 번역합니다."""
    
    language_names = {
        'ko': '한국어',
        'en': '영어',
        'ja': '일본어',
    }
    
    target_language_name = language_names.get(request.target_language, request.target_language)
    
    translated_title = ""
    if request.title:  # 제목이 제공된 경우에만 번역
        # 제목 번역
        title_system_prompt = f"""You are a helpful AI assistant that translates recipe titles accurately.
        Please translate the given recipe title into {target_language_name}.
        Keep the translation natural and appropriate for the target language's culinary context.
        Respond with ONLY the translated title, without any additional text or explanation."""

        title_messages = [
            SystemMessage(content=title_system_prompt),
            HumanMessage(content=request.title)
        ]
        
        title_response = llm.invoke(title_messages)
        translated_title = title_response.content.strip()
    
    # 레시피 내용 번역
    recipe_system_prompt = f"""You are a helpful AI assistant that translates recipes accurately.
    Please translate the given recipe into {target_language_name}.
    Follow these guidelines:
    1. Maintain the recipe's structure and format
    2. Ensure accurate translation of ingredients, measurements, and cooking instructions
    3. Use appropriate culinary terminology for the target language
    4. Keep the same markdown formatting if present
    5. Preserve line breaks and spacing
    
    Respond with ONLY the translated recipe, without any additional text or explanation."""

    recipe_messages = [
        SystemMessage(content=recipe_system_prompt),
        HumanMessage(content=request.recipe)
    ]
    
    recipe_response = llm.invoke(recipe_messages)
    translated_recipe = recipe_response.content.strip()
    
    return RecipeTranslateResponse(
        translated_recipe=translated_recipe,
        translated_title=translated_title
    )

@app.post("/api/recipe/generate")
async def generate_recipe(request: RecipeGenerateRequest) -> RecipeGenerateResponse:
    """문자열을 기반으로 구조화된 레시피를 생성합니다."""
    
    system_prompt = """You are a helpful AI assistant that generates detailed recipes.
    Based on the user's input, create a complete recipe with a clear title and step-by-step instructions.
    The recipe should be practical, easy to follow, and include all necessary details.
    Format the recipe with clear sections for ingredients and cooking steps.

    Please generate the recipe into the following format:

    # Recipe Title

    ## Ingredients
    - Ingredient 1
    - Ingredient 2
    ...

    ## Instructions
    1. First step
    2. Second step
    ...

    ## Cooking Tips
    - Tip 1
    - Tip 2
    ...
    Please maintain all information from the input recipe while organizing it into the above format.
    Keep it concise and remove any unnecessary explanations or repetitions.
    Keep the language natural and engaging while maintaining accuracy and clarity.
    Also, maintain the original language of the input recipe."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.content)
    ]
    
    response = llm.invoke(messages)
    
    # GPT 응답에서 제목과 내용 추출
    try:
        # 제목 추출 (첫 번째 # 으로 시작하는 라인)
        content_lines = response.content.split('\n')
        title = content_lines[0].replace('# ', '').strip()
        
        # 전체 내용은 그대로 사용
        content = response.content
        
        return RecipeGenerateResponse(
            title=title,
            content=content
        )
    except Exception as e:
        print(f"Error parsing GPT response: {e}")
        # 파싱 실패 시 기본 응답
        return RecipeGenerateResponse(
            title="새로운 레시피",
            content=response.content
        )

@app.post("/api/recipe/generate-multilingual")
async def generate_multilingual_recipe(request: RecipeGenerateRequest) -> dict:
    """사용자 입력을 기반으로 3개 언어(한국어, 영어, 일본어)로 레시피를 생성합니다."""
    
    # 각 언어별 프롬프트 생성
    prompts = {
        "ko": """다음 레시피를 한국어로 작성해주세요. 제목, 간단한 설명, 그리고 다음 형식으로 레시피 내용을 작성해주세요:

# [레시피 제목]
[레시피 설명]

## 재료
- 재료 1
- 재료 2
...

## 조리 방법
1. 첫 번째 단계
2. 두 번째 단계
...

## 조리 팁
- 팁 1
- 팁 2
...""",
        "en": """Please write the following recipe in English. Include a title, brief description, and recipe content in the following format:

# [Recipe Title]
[Recipe Description]

## Ingredients
- Ingredient 1
- Ingredient 2
...

## Instructions
1. First step
2. Second step
...

## Cooking Tips
- Tip 1
- Tip 2
...""",
        "ja": """以下のレシピを日本語で書いてください。タイトル、簡単な説明、そして以下の形式でレシピの内容を書いてください：

# [レシピタイトル]
[レシピの説明]

## 材料
- 材料 1
- 材料 2
...

## 作り方
1. 最初のステップ
2. 次のステップ
...

## 調理のコツ
- コツ 1
- コツ 2
..."""
    }
    
    translations = []
    
    # 각 언어별로 레시피 생성
    for lang, prompt in prompts.items():
        messages = [
            SystemMessage(content=prompt),
            HumanMessage(content=request.content)
        ]
        
        response = llm.invoke(messages)
        recipe_data = parse_recipe_content(response.content)
        
        translations.append({
            "language": lang,
            "title": recipe_data["title"],
            "description": recipe_data["description"],
            "content": recipe_data["content"]
        })
    
    # 태그 생성을 위한 프롬프트
    tag_prompt = """Based on the recipe, suggest up to 5 relevant tags in English.
    Return only the tags separated by commas, for example: "Korean, Spicy, Stew, Traditional, Healthy"
    """
    
    tag_messages = [
        SystemMessage(content=tag_prompt),
        HumanMessage(content=request.content)
    ]
    
    tag_response = llm.invoke(tag_messages)
    tags = [tag.strip() for tag in tag_response.content.split(',')][:5]
    
    return {
        "translations": translations,
        "tags": tags
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 시 정리 작업을 수행합니다."""
    if printed_ids:
        await memory.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 