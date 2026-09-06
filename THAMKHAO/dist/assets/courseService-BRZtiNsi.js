import{c as l,o}from"./index-CwfCnHLt.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=l("Zap",[["polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2",key:"45s27k"}]]),p={async getCurriculum(t){try{const{data:e,error:r}=await o.from("chapters").select(`
          id,
          title,
          sort_order,
          lessons (
            id,
            title,
            theory_content,
            sort_order,
            exercises (
              id,
              content,
              options,
              correct_answer,
              explanation,
              sort_order
            )
          )
        `).order("sort_order",{ascending:!0});if(r)return console.error("Lỗi lấy curriculum:",r.message),[];const s=e==null?void 0:e.map(c=>({...c,lessons:c.lessons.sort((i,n)=>i.sort_order-n.sort_order).map(i=>({...i,exercises:i.exercises.sort((n,a)=>n.sort_order-a.sort_order),isCompleted:!1}))}));if(t&&s){const{data:c}=await o.from("student_lesson_progress").select("lesson_id, is_completed").eq("user_id",t);if(c&&c.length>0){const i=c.reduce((n,a)=>(n[a.lesson_id]=a.is_completed,n),{});s.forEach(n=>{n.lessons.forEach(a=>{a.isCompleted=i[a.id]||!1})})}}return s||[]}catch(e){return console.error("System Error:",e),[]}},async markLessonCompleted(t,e){if(!t)return;const{error:r}=await o.from("student_lesson_progress").upsert({user_id:t,lesson_id:e,is_completed:!0});r&&console.error("Lỗi cập nhật tiến độ bài học:",r.message)},async createChapter(t){try{const{data:e,error:r}=await o.from("chapters").insert(t).select().single();if(r)throw r;return e}catch(e){return console.error("Lỗi createChapter:",e),null}},async updateChapter(t,e){try{const{data:r,error:s}=await o.from("chapters").update(e).eq("id",t).select().single();if(s)throw s;return r}catch(r){return console.error("Lỗi updateChapter:",r),null}},async deleteChapter(t){try{const{error:e}=await o.from("chapters").delete().eq("id",t);if(e)throw e;return!0}catch(e){return console.error("Lỗi deleteChapter:",e),!1}},async createLesson(t){try{const{data:e,error:r}=await o.from("lessons").insert(t).select().single();if(r)throw r;return e}catch(e){return console.error("Lỗi createLesson:",e),null}},async updateLesson(t,e){try{const{data:r,error:s}=await o.from("lessons").update(e).eq("id",t).select().single();if(s)throw s;return r}catch(r){return console.error("Lỗi updateLesson:",r),null}},async deleteLesson(t){try{const{error:e}=await o.from("lessons").delete().eq("id",t);if(e)throw e;return!0}catch(e){return console.error("Lỗi deleteLesson:",e),!1}},async createExercise(t){try{const{data:e,error:r}=await o.from("exercises").insert(t).select().single();if(r)throw r;return e}catch(e){return console.error("Lỗi createExercise:",e),null}},async updateExercise(t,e){try{const{data:r,error:s}=await o.from("exercises").update(e).eq("id",t).select().single();if(s)throw s;return r}catch(r){return console.error("Lỗi updateExercise:",r),null}},async deleteExercise(t){try{const{error:e}=await o.from("exercises").delete().eq("id",t);if(e)throw e;return!0}catch(e){return console.error("Lỗi deleteExercise:",e),!1}}};export{d as Z,p as c};
