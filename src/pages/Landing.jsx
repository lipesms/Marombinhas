import { useState } from 'react';
import { Brand } from '../components/Brand.jsx';
import { MacroRow, Ring } from '../components/Charts.jsx';
import Icon from '../components/Icon.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useTheme } from '../components/ThemeContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { RESERVED, fmtN, normalizeSlug } from '../lib/utils.js';

const SAMPLE = { kcal: 1380, goal: 2000 };

export default function Landing() {
  const toast = useToast();
  const [value, setValue] = useState('');
  const { theme, assets } = useTheme();
  let saved = null;
  try { saved = localStorage.getItem('macrinhos:code'); } catch { /* ok */ }

  const enter = (e) => {
    e.preventDefault();
    const slug = normalizeSlug(value);
    if (slug.length < 3) return toast('Escolha um nome com pelo menos 3 letras ou números.');
    if (RESERVED.includes(slug)) return toast('Esse nome não pode ser usado. Escolha outro.');
    location.href = `/${slug}`;
  };

  return (
    <div className="land">
      <div className="top"><Brand /><ThemeToggle /></div>
      <div className="land-grid">
        <div className="hero">
          <h1>Conte o que comeu. <em>A IA faz a conta.</em></h1>
          <p className="lead">Calorias, proteínas, carboidratos e gorduras do dia em um só lugar. Mande uma foto do prato ou escreva em poucas palavras.</p>
          <form className="cta" onSubmit={enter}>
            <label className="field-label" htmlFor="slug" style={{ margin: 0 }}>Seu nome no endereço</label>
            <div className="slug-box"><span>{location.host}/</span><input id="slug" className="in" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength={40} placeholder="seunome" /></div>
            <button className="btn primary big" type="submit">Entrar no meu painel</button>
            {saved && <a className="cont" href={`/${saved}`}>Continuar em /{saved}</a>}
            <p className="small">Se o nome ainda não existir, você cria o painel na próxima tela. Sem senha: quem souber o endereço entra, então prefira um nome pouco óbvio.</p>
          </form>
          <ul className="points">
            <li><Icon name="camera" size={20} /><span><b>Foto ou texto.</b> Descreva a refeição do seu jeito.</span></li>
            <li><Icon name="target" size={20} /><span><b>Metas suas.</b> Defina calorias e macros ou deixe o app sugerir.</span></li>
            <li><Icon name="dumbbell" size={20} /><span><b>Caderno de treino.</b> Monte suas fichas e acompanhe a evolução dos pesos.</span></li>
            <li><Icon name="check" size={20} /><span><b>Sem cadastro.</b> Seu endereço é o seu acesso, em qualquer aparelho.</span></li>
          </ul>
        </div>
        <div className="preview">
          <img className={`mascot${theme === 'light' ? ' cinna' : ''}`} src={assets.logo} width="480" height="480" alt={theme === 'light' ? 'Mascote fitness do Marombinhas' : 'Guaxinim fitness, mascote do Marombinhas'} />
          <div className="card" aria-hidden="true">
            <span className="tag">Exemplo</span>
            <div className="sum">
              <div className="ring"><Ring consumed={SAMPLE.kcal} goal={SAMPLE.goal} /><div className="ring-mid num"><b>{fmtN(SAMPLE.goal - SAMPLE.kcal)}</b><span>kcal restantes</span></div></div>
              <div className="sum-side"><div className="stat"><small>Consumido</small><b className="num">{fmtN(SAMPLE.kcal)}<i>kcal</i></b></div><div className="stat"><small>Meta</small><b className="num">{fmtN(SAMPLE.goal)}<i>kcal</i></b></div></div>
            </div>
            <div className="macros">
              <MacroRow label="Proteínas" val={84} goal={130} color="--protein" />
              <MacroRow label="Carboidratos" val={150} goal={240} color="--carbs" />
              <MacroRow label="Gorduras" val={48} goal={65} color="--fat" />
            </div>
          </div>
        </div>
      </div>
      <p className="disclaimer">As estimativas feitas por IA são aproximadas e podem errar; ajuste os valores quando souber os números reais. O Marombinhas não substitui o acompanhamento de nutricionista ou médico.</p>
    </div>
  );
}
