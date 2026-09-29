import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buscarEventos,
  buscarRelatorioEvento,
  listarEquipes,
  listarMovimentacoes,
} from "../services/api";
import type {
  CategoriaRelatorio,
  Equipe,
  Evento,
  MovimentacaoPontuacao,
  RelatorioEvento,
} from "../types/Eventos";

type EscopoExportacao = "ranking" | "avaliacoes";

export function EventReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const eventoId = Number(id);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoPontuacao[]>(
    [],
  );
  const [relatorio, setRelatorio] = useState<RelatorioEvento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [equipesExpandidas, setEquipesExpandidas] = useState<
    Record<number, boolean>
  >({});
  const [escopoExportacao, setEscopoExportacao] =
    useState<EscopoExportacao>("ranking");

  useEffect(() => {
    if (!Number.isInteger(eventoId) || eventoId <= 0) {
      queueMicrotask(() => {
        setErro("Evento inválido.");
        setCarregando(false);
      });
      return;
    }

    void Promise.resolve().then(async () => {
      setCarregando(true);
      setErro("");
      try {
        const [eventos, todasEquipes, todasMovimentacoes, consolidado] =
          await Promise.all([
            buscarEventos(),
            listarEquipes(),
            listarMovimentacoes(),
            buscarRelatorioEvento(eventoId),
          ]);
        setEvento(eventos.find((item) => item.id === eventoId) ?? null);
        setEquipes(
          todasEquipes.filter((equipe) => equipe.idEvento === eventoId),
        );
        setMovimentacoes(
          todasMovimentacoes.filter(
            (movimentacao) => movimentacao.idEvento === eventoId,
          ),
        );
        setRelatorio(consolidado);
      } catch (causa) {
        setErro(
          causa instanceof Error
            ? causa.message
            : "Não foi possível carregar o relatório.",
        );
      } finally {
        setCarregando(false);
      }
    });
  }, [eventoId]);

  const ranking = useMemo(() => {
    return equipes
      .map((equipe) => {
        const consolidado = relatorio?.equipes.find(
          (item) => item.id === equipe.id,
        );
        const pontosAvaliacoes = consolidado?.totalNotas ?? 0;
        const pontosMovimentacoes = movimentacoes
          .filter((item) => item.idEquipe === equipe.id)
          .reduce(
            (total, item) =>
              total +
              (item.tipo === "PENALIDADE"
                ? -Math.abs(item.pontos)
                : Math.abs(item.pontos)),
            0,
          );

        return {
          equipe,
          categorias: consolidado?.categorias ?? [],
          pontosAvaliacoes,
          pontosMovimentacoes,
          total: pontosAvaliacoes + pontosMovimentacoes,
        };
      })
      .sort(
        (primeiro, segundo) =>
          segundo.total - primeiro.total ||
          segundo.pontosAvaliacoes - primeiro.pontosAvaliacoes,
      );
  }, [equipes, movimentacoes, relatorio]);

  async function exportarPdf() {
    try {
      if (escopoExportacao === "avaliacoes") {
        await exportarAvaliacoesConsolidadasPdf();
        return;
      }

      const elemento = document.getElementById(
        "report-ranking",
      );
      if (!elemento) return;

      const oculto = elemento.style.display === "none";
      elemento.style.display = "block";
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const canvas = await html2canvas(elemento, { scale: 2 });
      const imagem = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait" });
      const propriedades = pdf.getImageProperties(imagem);
      const largura = pdf.internal.pageSize.getWidth();
      const altura = (propriedades.height * largura) / propriedades.width;
      pdf.addImage(imagem, "PNG", 0, 0, largura, altura);
      pdf.save(
        `${evento?.nome.replace(/[^a-z0-9_-]/gi, "_") ?? "relatorio"}_evento_${eventoId}.pdf`,
      );
      if (oculto) elemento.style.display = "none";
    } catch {
      window.print();
    }
  }

  async function exportarAvaliacoesConsolidadasPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const larguraPagina = pdf.internal.pageSize.getWidth();
    const alturaPagina = pdf.internal.pageSize.getHeight();
    const margem = 16;

    ranking.forEach((item, indice) => {
      if (indice > 0) pdf.addPage();

      let posicaoY = 20;

      const desenharCabecalhoEquipe = (continuacao = false) => {
        pdf.setTextColor(0, 65, 139);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text("ESPANGLISH", margem, posicaoY);
        posicaoY += 8;
        pdf.setTextColor(23, 33, 53);
        pdf.setFontSize(16);
        pdf.text(
          continuacao ? "Avaliações consolidadas — continuação" : "Avaliações consolidadas",
          margem,
          posicaoY,
        );
        posicaoY += 8;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(evento?.nome ?? "Evento", margem, posicaoY);
        posicaoY += 11;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(item.equipe.nome, margem, posicaoY);
        posicaoY += 10;
      };

      const iniciarPaginaDeContinuacao = () => {
        pdf.addPage();
        posicaoY = 20;
        desenharCabecalhoEquipe(true);
      };

      const garantirEspaco = (altura: number) => {
        if (posicaoY + altura > alturaPagina - margem) {
          iniciarPaginaDeContinuacao();
        }
      };

      const desenharTituloSecao = (titulo: string) => {
        garantirEspaco(10);
        pdf.setFillColor(0, 65, 139);
        pdf.rect(margem, posicaoY, larguraPagina - margem * 2, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(titulo.toUpperCase(), margem + 3, posicaoY + 5.2);
        posicaoY += 8;
      };

      desenharCabecalhoEquipe();
      desenharTituloSecao("Avaliações por categoria e critério");

      if (item.categorias.length === 0) {
        pdf.setTextColor(104, 115, 138);
        pdf.text("Ainda não há avaliações lançadas para esta equipe.", margem + 3, posicaoY + 7);
        posicaoY += 12;
      } else {
        item.categorias.forEach((categoria) => {
          pdf.setFontSize(10);
          const linhasCategoria = pdf.splitTextToSize(categoria.nome, 130);
          const alturaCategoria = Math.max(8, linhasCategoria.length * 4.5 + 3.5);
          garantirEspaco(alturaCategoria + 7);

          pdf.setFillColor(230, 241, 251);
          pdf.rect(margem, posicaoY, larguraPagina - margem * 2, alturaCategoria, "F");
          pdf.setTextColor(0, 65, 139);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.text(linhasCategoria, margem + 3, posicaoY + 5.2);
          pdf.text(`Total: ${categoria.totalNotas}`, larguraPagina - margem - 3, posicaoY + 5.2, {
            align: "right",
          });
          posicaoY += alturaCategoria;

          pdf.setFillColor(244, 247, 251);
          pdf.rect(margem, posicaoY, larguraPagina - margem * 2, 7, "F");
          pdf.setTextColor(35, 48, 74);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text("CRITÉRIO", margem + 3, posicaoY + 4.7);
          pdf.text("TOTAL", larguraPagina - margem - 3, posicaoY + 4.7, { align: "right" });
          posicaoY += 7;

          categoria.criterios.forEach((criterio) => {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            const linhasCriterio = pdf.splitTextToSize(criterio.nome, 135);
            const alturaCriterio = Math.max(7, linhasCriterio.length * 4.3 + 3);
            garantirEspaco(alturaCriterio);

            pdf.setDrawColor(225, 231, 240);
            pdf.rect(margem, posicaoY, larguraPagina - margem * 2, alturaCriterio);
            pdf.setTextColor(23, 33, 53);
            pdf.text(linhasCriterio, margem + 3, posicaoY + 4.8);
            pdf.setFont("helvetica", "bold");
            pdf.text(String(criterio.totalNotas), larguraPagina - margem - 3, posicaoY + 4.8, {
              align: "right",
            });
            posicaoY += alturaCriterio;
          });
        });
      }

      garantirEspaco(11);
      pdf.setDrawColor(0, 65, 139);
      pdf.line(margem, posicaoY, larguraPagina - margem, posicaoY);
      posicaoY += 7;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(23, 33, 53);
      pdf.text("Total das avaliações", margem, posicaoY);
      pdf.setTextColor(0, 65, 139);
      pdf.text(String(item.pontosAvaliacoes), larguraPagina - margem, posicaoY, {
        align: "right",
      });
      posicaoY += 11;

      desenharTituloSecao("Movimentações");
      const movimentacoesDaEquipe = movimentacoes.filter(
        (movimentacao) => movimentacao.idEquipe === item.equipe.id,
      );

      if (movimentacoesDaEquipe.length === 0) {
        pdf.setTextColor(104, 115, 138);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Não há movimentações lançadas para esta equipe.", margem + 3, posicaoY + 7);
        posicaoY += 12;
      } else {
        pdf.setFillColor(244, 247, 251);
        pdf.rect(margem, posicaoY, larguraPagina - margem * 2, 7, "F");
        pdf.setTextColor(35, 48, 74);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text("DATA", margem + 3, posicaoY + 4.7);
        pdf.text("TIPO", margem + 29, posicaoY + 4.7);
        pdf.text("DESCRIÇÃO", margem + 55, posicaoY + 4.7);
        pdf.text("PONTOS", larguraPagina - margem - 3, posicaoY + 4.7, { align: "right" });
        posicaoY += 7;

        movimentacoesDaEquipe.forEach((movimentacao) => {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          const linhasDescricao = pdf.splitTextToSize(movimentacao.descricao, 90);
          const alturaMovimentacao = Math.max(7, linhasDescricao.length * 4 + 3);
          garantirEspaco(alturaMovimentacao);

          pdf.setDrawColor(225, 231, 240);
          pdf.rect(margem, posicaoY, larguraPagina - margem * 2, alturaMovimentacao);
          pdf.setTextColor(23, 33, 53);
          pdf.text(formatarData(movimentacao.dataLancamento), margem + 3, posicaoY + 4.8);
          pdf.text(movimentacao.tipo, margem + 29, posicaoY + 4.8);
          pdf.text(linhasDescricao, margem + 55, posicaoY + 4.8);
          pdf.setFont("helvetica", "bold");
          const pontos = movimentacao.tipo === "PENALIDADE"
            ? `-${Math.abs(movimentacao.pontos)}`
            : `+${Math.abs(movimentacao.pontos)}`;
          pdf.text(pontos, larguraPagina - margem - 3, posicaoY + 4.8, { align: "right" });
          posicaoY += alturaMovimentacao;
        });
      }
    });

    pdf.save(
      `${(evento?.nome ?? "relatorio").replace(/[^a-z0-9_-]/gi, "_")}_avaliacoes_consolidadas.pdf`,
    );
  }

  if (carregando) return <main className="app-shell"><p className="loading">Carregando relatório…</p></main>;
  if (erro) return <main className="app-shell"><p className="alert error" role="alert">{erro}</p></main>;
  if (!evento) return <main className="app-shell"><p className="alert" role="alert">Evento não encontrado.</p></main>;

  return <main className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">RELATÓRIO</p><h1>Relatório — {evento.nome}</h1></div>
      <div className="ContainerButtons">
        <select value={escopoExportacao} onChange={(event) => setEscopoExportacao(event.target.value as EscopoExportacao)}>
          <option value="ranking">Apenas ranking</option>
          <option value="avaliacoes">Avaliações consolidadas por equipe</option>
        </select>
        <button className="primary" onClick={() => void exportarPdf()}>Exportar PDF</button>
        <button className="secondary" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    </header>
    <section className="workspace">
      <div className="card" id="report-ranking">
        <h3>Ranking</h3>
        <table><thead><tr><th>Colocação</th><th>Equipe</th><th>Avaliações</th><th>Movimentações</th><th>Total</th></tr></thead><tbody>
          {ranking.map((item, indice) => <tr key={item.equipe.id} className={indice < 3 ? `ranking-top ranking-top-${indice + 1}` : undefined}>
            <td className="ranking-position">{indice + 1}º</td><td className="itemDestaque"><button type="button" className="team-report-link" onClick={() => setEquipesExpandidas((atual) => ({ ...atual, [item.equipe.id]: !atual[item.equipe.id] }))} aria-expanded={Boolean(equipesExpandidas[item.equipe.id])}>{item.equipe.nome}</button></td><td className="report-score">{item.pontosAvaliacoes}</td><td className={item.pontosMovimentacoes < 0 ? "negative" : "positive"}>{item.pontosMovimentacoes > 0 ? "+" : ""}{item.pontosMovimentacoes}</td><td className="itemDestaque report-score">{item.total}</td>
          </tr>)}
        </tbody></table>
      </div>
      {ranking.filter((item) => equipesExpandidas[item.equipe.id]).map((item) => <section className="card detail-card team-report-detail" key={`detalhe-${item.equipe.id}`}>
        <h3>{item.equipe.nome} — detalhes</h3>
        <div className="team-detail-grid">
          <section>
            <h4>Avaliações por categoria</h4>
            <CategoriasResumidas categorias={item.categorias} />
          </section>
          <section>
            <h4>Movimentações</h4>
            <MovimentacoesDaEquipe movimentacoes={movimentacoes.filter((movimentacao) => movimentacao.idEquipe === item.equipe.id)} />
          </section>
        </div>
      </section>)}
    </section>
  </main>;
}

function CategoriasResumidas({ categorias }: { categorias: CategoriaRelatorio[] }) {
  if (categorias.length === 0) return <p className="muted">Ainda não há avaliações lançadas para esta equipe.</p>;

  return <table><thead><tr><th>Categoria</th><th>Total das avaliações</th></tr></thead><tbody>
    {categorias.map((categoria) => <tr key={categoria.id}><td>{categoria.nome}</td><td className="report-score">{categoria.totalNotas}</td></tr>)}
  </tbody></table>;
}

function MovimentacoesDaEquipe({ movimentacoes }: { movimentacoes: MovimentacaoPontuacao[] }) {
  if (movimentacoes.length === 0) return <p className="muted">Não há movimentações lançadas para esta equipe.</p>;

  return <table><thead><tr><th>Lançamento</th><th>Tipo</th><th>Descrição</th><th>Pontos</th></tr></thead><tbody>
    {movimentacoes.map((movimentacao) => <tr key={movimentacao.id}>
      <td>{formatarData(movimentacao.dataLancamento)}</td><td>{movimentacao.tipo}</td><td>{movimentacao.descricao}</td><td className={movimentacao.tipo === "PENALIDADE" ? "negative" : "positive"}>{movimentacao.tipo === "PENALIDADE" ? "-" : "+"}{Math.abs(movimentacao.pontos)}</td>
    </tr>)}
  </tbody></table>;
}

function formatarData(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return data;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}
